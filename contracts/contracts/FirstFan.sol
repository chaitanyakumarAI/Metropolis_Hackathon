// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title FirstFan
/// @notice On-chain early-supporter registry for emerging creators.
///         Every support is recorded with the supporter's permanent rank
///         (fan #1, #2, ...), creator-defined tiers decide who can unlock
///         exclusive posts and vote in community polls, and creators pull
///         their accumulated contributions with a reentrancy-safe withdraw.
contract FirstFan {
    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    uint8 public constant MAX_TIERS = 5;
    uint8 public constant ACCESS_PUBLIC = 0;
    /// @dev Access level reserved for "founding fans" (rank <= foundingSlots).
    uint8 public constant ACCESS_FOUNDING = 255;
    uint256 public constant MIN_SUPPORT = 0.001 ether;
    uint32 public constant MAX_FOUNDING_SLOTS = 1000;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Tier {
        string name;
        uint128 minTotal; // cumulative support (wei) required
        string perk; // human-readable description of the benefit
    }

    struct Creator {
        address account;
        string handle;
        string name;
        string bio;
        string avatarURI;
        string category;
        uint32 foundingSlots;
        uint32 supporterCount;
        uint32 supportCount;
        uint64 createdAt;
        uint128 totalRaised;
        uint128 balance;
    }

    struct SupporterRecord {
        uint32 rank; // 1-based order of first support, 0 = never supported
        uint32 supportCount;
        uint64 firstSupportAt;
        uint64 lastSupportAt;
        uint128 total;
    }

    struct SupportEntry {
        uint256 id;
        address creator;
        address supporter;
        uint128 amount;
        uint64 timestamp;
        uint64 blockNumber;
        uint32 rank;
        string note;
    }

    struct Post {
        uint256 id;
        address creator;
        uint64 createdAt;
        uint8 access;
        string title;
        string body; // public text (teaser for gated posts)
        string imageURI; // public image (cover for gated posts)
        bytes sealedContent; // encrypted payload for gated posts, empty for public ones
    }

    struct Poll {
        uint256 id;
        address creator;
        uint64 createdAt;
        uint64 endsAt;
        uint8 access;
        string question;
        string[] options;
        uint32[] votes;
    }

    struct FanView {
        address creator;
        SupporterRecord record;
        uint8 tier;
        bool founding;
    }

    struct SupporterView {
        address supporter;
        SupporterRecord record;
        uint8 tier;
        bool founding;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    mapping(address => Creator) private _creators;
    mapping(address => Tier[]) private _tiers;
    mapping(bytes32 => address) public handleOwner;
    address[] private _creatorList;

    mapping(address => mapping(address => SupporterRecord)) private _records;
    mapping(address => address[]) private _supportersByRank;
    mapping(address => address[]) private _fanCreators;

    SupportEntry[] private _supports;
    mapping(address => uint256[]) private _creatorSupportIds;

    Post[] private _posts;
    mapping(address => uint256[]) private _creatorPostIds;

    Poll[] private _polls;
    mapping(address => uint256[]) private _creatorPollIds;
    mapping(uint256 => mapping(address => uint8)) private _voteOf; // option index + 1

    uint256 private _locked = 1;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event CreatorRegistered(address indexed creator, string handle, string name, string category, uint32 foundingSlots);
    event CreatorUpdated(address indexed creator);
    event TiersUpdated(address indexed creator, uint256 tierCount);
    event Supported(
        uint256 indexed supportId,
        address indexed creator,
        address indexed supporter,
        uint256 amount,
        uint256 supporterTotal,
        uint32 rank,
        string note
    );
    event PostPublished(uint256 indexed postId, address indexed creator, uint8 access, string title);
    event PollCreated(uint256 indexed pollId, address indexed creator, uint8 access, uint64 endsAt, string question);
    event Voted(uint256 indexed pollId, address indexed voter, uint8 option);
    event Withdrawn(address indexed creator, address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error AlreadyRegistered();
    error NotRegistered();
    error HandleTaken();
    error InvalidHandle();
    error InvalidLength(string field);
    error InvalidTiers();
    error InvalidAccess();
    error SupportTooSmall();
    error CannotSupportSelf();
    error NothingToWithdraw();
    error TransferFailed();
    error Reentrancy();
    error InvalidPoll();
    error PollClosed();
    error AlreadyVoted();
    error NotEligible();
    error ZeroAddress();

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyCreator() {
        if (_creators[msg.sender].createdAt == 0) revert NotRegistered();
        _;
    }

    // ---------------------------------------------------------------------
    // Creator management
    // ---------------------------------------------------------------------

    function registerCreator(
        string calldata handle,
        string calldata name,
        string calldata bio,
        string calldata avatarURI,
        string calldata category,
        uint32 foundingSlots,
        Tier[] calldata tiers
    ) external {
        if (_creators[msg.sender].createdAt != 0) revert AlreadyRegistered();
        _validateHandle(handle);
        bytes32 key = keccak256(bytes(handle));
        if (handleOwner[key] != address(0)) revert HandleTaken();
        _validateProfile(name, bio, avatarURI, category, foundingSlots);

        handleOwner[key] = msg.sender;
        Creator storage c = _creators[msg.sender];
        c.account = msg.sender;
        c.handle = handle;
        c.name = name;
        c.bio = bio;
        c.avatarURI = avatarURI;
        c.category = category;
        c.foundingSlots = foundingSlots;
        c.createdAt = uint64(block.timestamp);
        _creatorList.push(msg.sender);

        emit CreatorRegistered(msg.sender, handle, name, category, foundingSlots);
        _setTiers(tiers);
    }

    function updateProfile(
        string calldata name,
        string calldata bio,
        string calldata avatarURI,
        string calldata category,
        uint32 foundingSlots
    ) external onlyCreator {
        _validateProfile(name, bio, avatarURI, category, foundingSlots);
        Creator storage c = _creators[msg.sender];
        // Founding slots can grow but never shrink, so existing founding fans keep their status.
        if (foundingSlots < c.foundingSlots) revert InvalidLength("foundingSlots");
        c.name = name;
        c.bio = bio;
        c.avatarURI = avatarURI;
        c.category = category;
        c.foundingSlots = foundingSlots;
        emit CreatorUpdated(msg.sender);
    }

    function setTiers(Tier[] calldata tiers) external onlyCreator {
        _setTiers(tiers);
    }

    function _setTiers(Tier[] calldata tiers) private {
        if (tiers.length > MAX_TIERS) revert InvalidTiers();
        delete _tiers[msg.sender];
        uint128 prev = 0;
        for (uint256 i = 0; i < tiers.length; i++) {
            Tier calldata t = tiers[i];
            if (t.minTotal <= prev) revert InvalidTiers(); // strictly ascending, > 0
            _checkLen(bytes(t.name).length, 1, 32, "tier.name");
            _checkLen(bytes(t.perk).length, 0, 140, "tier.perk");
            prev = t.minTotal;
            _tiers[msg.sender].push(t);
        }
        emit TiersUpdated(msg.sender, tiers.length);
    }

    // ---------------------------------------------------------------------
    // Support
    // ---------------------------------------------------------------------

    function support(address creator, string calldata note) external payable {
        Creator storage c = _creators[creator];
        if (c.createdAt == 0) revert NotRegistered();
        if (msg.sender == creator) revert CannotSupportSelf();
        if (msg.value < MIN_SUPPORT) revert SupportTooSmall();
        _checkLen(bytes(note).length, 0, 140, "note");

        SupporterRecord storage r = _records[creator][msg.sender];
        if (r.rank == 0) {
            c.supporterCount += 1;
            r.rank = c.supporterCount;
            r.firstSupportAt = uint64(block.timestamp);
            _supportersByRank[creator].push(msg.sender);
            _fanCreators[msg.sender].push(creator);
        }
        uint128 amount = uint128(msg.value);
        r.total += amount;
        r.supportCount += 1;
        r.lastSupportAt = uint64(block.timestamp);

        c.supportCount += 1;
        c.totalRaised += amount;
        c.balance += amount;

        uint256 id = _supports.length;
        _supports.push(
            SupportEntry({
                id: id,
                creator: creator,
                supporter: msg.sender,
                amount: amount,
                timestamp: uint64(block.timestamp),
                blockNumber: uint64(block.number),
                rank: r.rank,
                note: note
            })
        );
        _creatorSupportIds[creator].push(id);

        emit Supported(id, creator, msg.sender, amount, r.total, r.rank, note);
    }

    /// @notice Creator withdraws their full accumulated balance to `to`.
    function withdraw(address payable to) external onlyCreator nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        Creator storage c = _creators[msg.sender];
        uint256 amount = c.balance;
        if (amount == 0) revert NothingToWithdraw();
        c.balance = 0; // effects before interaction
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, to, amount);
    }

    // ---------------------------------------------------------------------
    // Posts
    // ---------------------------------------------------------------------

    function publishPost(
        uint8 access,
        string calldata title,
        string calldata body,
        string calldata imageURI,
        bytes calldata sealedContent
    ) external onlyCreator returns (uint256 id) {
        _validateAccess(msg.sender, access);
        _checkLen(bytes(title).length, 1, 100, "title");
        _checkLen(bytes(body).length, 0, 1000, "body");
        _checkLen(bytes(imageURI).length, 0, 400, "imageURI");
        if (access == ACCESS_PUBLIC) {
            if (sealedContent.length != 0) revert InvalidLength("sealedContent");
        } else {
            _checkLen(sealedContent.length, 1, 4096, "sealedContent");
        }

        id = _posts.length;
        _posts.push(
            Post({
                id: id,
                creator: msg.sender,
                createdAt: uint64(block.timestamp),
                access: access,
                title: title,
                body: body,
                imageURI: imageURI,
                sealedContent: sealedContent
            })
        );
        _creatorPostIds[msg.sender].push(id);
        emit PostPublished(id, msg.sender, access, title);
    }

    // ---------------------------------------------------------------------
    // Community polls (supporter governance)
    // ---------------------------------------------------------------------

    function createPoll(
        uint8 access,
        string calldata question,
        string[] calldata options,
        uint64 duration
    ) external onlyCreator returns (uint256 id) {
        _validateAccess(msg.sender, access);
        _checkLen(bytes(question).length, 1, 140, "question");
        if (options.length < 2 || options.length > 4) revert InvalidPoll();
        if (duration < 1 hours || duration > 30 days) revert InvalidPoll();
        for (uint256 i = 0; i < options.length; i++) {
            _checkLen(bytes(options[i]).length, 1, 60, "option");
        }

        id = _polls.length;
        Poll storage p = _polls.push();
        p.id = id;
        p.creator = msg.sender;
        p.createdAt = uint64(block.timestamp);
        p.endsAt = uint64(block.timestamp) + duration;
        p.access = access;
        p.question = question;
        for (uint256 i = 0; i < options.length; i++) {
            p.options.push(options[i]);
            p.votes.push(0);
        }
        _creatorPollIds[msg.sender].push(id);
        emit PollCreated(id, msg.sender, access, p.endsAt, question);
    }

    /// @notice One vote per eligible supporter. Eligibility is checked against
    ///         on-chain support records, so it cannot be bypassed client-side.
    function vote(uint256 pollId, uint8 option) external {
        if (pollId >= _polls.length) revert InvalidPoll();
        Poll storage p = _polls[pollId];
        if (block.timestamp >= p.endsAt) revert PollClosed();
        if (option >= p.options.length) revert InvalidPoll();
        if (_voteOf[pollId][msg.sender] != 0) revert AlreadyVoted();
        // Polls are for the community: the creator cannot vote, and public
        // polls still require having supported at least once.
        if (msg.sender == p.creator) revert NotEligible();
        if (_records[p.creator][msg.sender].rank == 0) revert NotEligible();
        if (!canAccess(p.creator, msg.sender, p.access)) revert NotEligible();

        _voteOf[pollId][msg.sender] = option + 1;
        p.votes[option] += 1;
        emit Voted(pollId, msg.sender, option);
    }

    // ---------------------------------------------------------------------
    // Eligibility views
    // ---------------------------------------------------------------------

    /// @notice Highest creator tier (1-based) the fan has reached; 0 if none.
    function tierOf(address creator, address fan) public view returns (uint8) {
        uint128 total = _records[creator][fan].total;
        Tier[] storage t = _tiers[creator];
        for (uint256 i = t.length; i > 0; i--) {
            if (total >= t[i - 1].minTotal) return uint8(i);
        }
        return 0;
    }

    function isFoundingFan(address creator, address fan) public view returns (bool) {
        uint32 rank = _records[creator][fan].rank;
        return rank != 0 && rank <= _creators[creator].foundingSlots;
    }

    /// @notice Whether `fan` satisfies `access` for `creator`'s content.
    function canAccess(address creator, address fan, uint8 access) public view returns (bool) {
        if (fan == creator) return true;
        if (access == ACCESS_PUBLIC) return true;
        if (access == ACCESS_FOUNDING) return isFoundingFan(creator, fan);
        return tierOf(creator, fan) >= access;
    }

    function canAccessPost(uint256 postId, address fan) external view returns (bool) {
        Post storage p = _posts[postId];
        return canAccess(p.creator, fan, p.access);
    }

    // ---------------------------------------------------------------------
    // Read views (paginated, newest first where noted)
    // ---------------------------------------------------------------------

    function isCreator(address account) external view returns (bool) {
        return _creators[account].createdAt != 0;
    }

    function creatorCount() external view returns (uint256) {
        return _creatorList.length;
    }

    function getCreator(address account) external view returns (Creator memory creator, Tier[] memory tiers) {
        return (_creators[account], _tiers[account]);
    }

    function getCreatorByHandle(string calldata handle) external view returns (Creator memory creator, Tier[] memory tiers) {
        address account = handleOwner[keccak256(bytes(handle))];
        return (_creators[account], _tiers[account]);
    }

    /// @notice Creators in registration order.
    function getCreators(uint256 offset, uint256 limit) external view returns (Creator[] memory out) {
        uint256 n = _creatorList.length;
        if (offset >= n) return new Creator[](0);
        uint256 end = offset + limit > n ? n : offset + limit;
        out = new Creator[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = _creators[_creatorList[i]];
    }

    function getSupporter(address creator, address fan)
        external
        view
        returns (SupporterRecord memory record, uint8 tier, bool founding)
    {
        return (_records[creator][fan], tierOf(creator, fan), isFoundingFan(creator, fan));
    }

    /// @notice Supporters ordered by rank (earliest first).
    function getSupporters(address creator, uint256 offset, uint256 limit)
        external
        view
        returns (SupporterView[] memory out)
    {
        address[] storage list = _supportersByRank[creator];
        uint256 n = list.length;
        if (offset >= n) return new SupporterView[](0);
        uint256 end = offset + limit > n ? n : offset + limit;
        out = new SupporterView[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            address fan = list[i];
            out[i - offset] = SupporterView(fan, _records[creator][fan], tierOf(creator, fan), isFoundingFan(creator, fan));
        }
    }

    /// @notice Every creator a fan has supported, with rank/tier — the fan's portable support passport.
    function getFanPassport(address fan) external view returns (FanView[] memory out) {
        address[] storage list = _fanCreators[fan];
        out = new FanView[](list.length);
        for (uint256 i = 0; i < list.length; i++) {
            address creator = list[i];
            out[i] = FanView(creator, _records[creator][fan], tierOf(creator, fan), isFoundingFan(creator, fan));
        }
    }

    function supportCount() external view returns (uint256) {
        return _supports.length;
    }

    function postCount() external view returns (uint256) {
        return _posts.length;
    }

    function pollCount() external view returns (uint256) {
        return _polls.length;
    }

    /// @notice Global support activity, newest first.
    function getRecentSupports(uint256 offset, uint256 limit) external view returns (SupportEntry[] memory out) {
        uint256 n = _supports.length;
        (uint256 count, uint256 start) = _window(n, offset, limit);
        out = new SupportEntry[](count);
        for (uint256 i = 0; i < count; i++) out[i] = _supports[start - i];
    }

    /// @notice A creator's support activity, newest first.
    function getCreatorSupports(address creator, uint256 offset, uint256 limit)
        external
        view
        returns (SupportEntry[] memory out)
    {
        uint256[] storage ids = _creatorSupportIds[creator];
        (uint256 count, uint256 start) = _window(ids.length, offset, limit);
        out = new SupportEntry[](count);
        for (uint256 i = 0; i < count; i++) out[i] = _supports[ids[start - i]];
    }

    /// @notice Global feed, newest first.
    function getRecentPosts(uint256 offset, uint256 limit) external view returns (Post[] memory out) {
        (uint256 count, uint256 start) = _window(_posts.length, offset, limit);
        out = new Post[](count);
        for (uint256 i = 0; i < count; i++) out[i] = _posts[start - i];
    }

    function getCreatorPosts(address creator, uint256 offset, uint256 limit) external view returns (Post[] memory out) {
        uint256[] storage ids = _creatorPostIds[creator];
        (uint256 count, uint256 start) = _window(ids.length, offset, limit);
        out = new Post[](count);
        for (uint256 i = 0; i < count; i++) out[i] = _posts[ids[start - i]];
    }

    function getPost(uint256 postId) external view returns (Post memory) {
        return _posts[postId];
    }

    function getCreatorPolls(address creator) external view returns (Poll[] memory out) {
        uint256[] storage ids = _creatorPollIds[creator];
        out = new Poll[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) out[i] = _polls[ids[ids.length - 1 - i]];
    }

    function getPoll(uint256 pollId) external view returns (Poll memory) {
        return _polls[pollId];
    }

    /// @return option index + 1 the voter chose, or 0 if they have not voted.
    function voteOf(uint256 pollId, address voter) external view returns (uint8) {
        return _voteOf[pollId][voter];
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Newest-first window: returns item count and the index of the first (newest) item.
    function _window(uint256 n, uint256 offset, uint256 limit) private pure returns (uint256 count, uint256 start) {
        if (offset >= n || limit == 0) return (0, 0);
        uint256 remaining = n - offset;
        count = limit < remaining ? limit : remaining;
        start = n - 1 - offset;
    }

    function _validateAccess(address creator, uint8 access) private view {
        if (access == ACCESS_PUBLIC || access == ACCESS_FOUNDING) return;
        if (access > _tiers[creator].length) revert InvalidAccess();
    }

    function _validateProfile(
        string calldata name,
        string calldata bio,
        string calldata avatarURI,
        string calldata category,
        uint32 foundingSlots
    ) private pure {
        _checkLen(bytes(name).length, 1, 48, "name");
        _checkLen(bytes(bio).length, 0, 280, "bio");
        _checkLen(bytes(avatarURI).length, 0, 400, "avatarURI");
        _checkLen(bytes(category).length, 1, 24, "category");
        if (foundingSlots == 0 || foundingSlots > MAX_FOUNDING_SLOTS) revert InvalidLength("foundingSlots");
    }

    function _validateHandle(string calldata handle) private pure {
        bytes calldata b = bytes(handle);
        if (b.length < 3 || b.length > 20) revert InvalidHandle();
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 ch = b[i];
            bool ok = (ch >= 0x61 && ch <= 0x7a) || (ch >= 0x30 && ch <= 0x39) || ch == 0x5f; // a-z 0-9 _
            if (!ok) revert InvalidHandle();
        }
    }

    function _checkLen(uint256 len, uint256 min, uint256 max, string memory field) private pure {
        if (len < min || len > max) revert InvalidLength(field);
    }
}
