// config.js — FSRP Management Bot Configuration
  // Last updated: full role/channel ID audit from live server export

  module.exports = {
    heartbeatInterval: 20_000,
    snapshotInterval:  120_000,
    dbScanInterval:    60_000,

    aiBaseUrl: 'https://integrate.api.nvidia.com/v1',
    aiModel:   'meta/llama-3.3-70b-instruct',

    colors: {
      primary: 0x2B2D31,
      neutral: 0x3D4045,
      success: 0x2D7D46,
      danger:  0x992D22,
      warning: 0xC37D00,
      gold:    0x8B7536,
      blue:    0x1D6FA5,
      red:     0xED4245,
      purple:  0x9B59B6,
    },

    channels: {
      // ── Internal databases ──────────────────────────────────
      gameDatabase:            '1488136483041710221',
      discordDatabase:         '1488136399084458065',
      verifyDatabase:          '1488136027704004689',

      // ── Staff channels ──────────────────────────────────────
      logs:                    '1427862063681900637',
      staffChat:               '1488332986867777606',
      staffAnnouncement:       '1489778130305421484',
      staffRules:              '1488349045096185967',
      discordStaffRules:       '1488353641239810109',
      staffMedia:              '1488333044250050611',
      loaRequest:              '1488333093663408341',
      staffPromotion:          '1490728722360303917',   // FIXED (was pointing at applications-results)
      staffReview:             '1487893136687759421',
      hrCentral:               '1488138175057498142',
      shiftCards:              '1488548099055030313',

      // ── Applications ────────────────────────────────────────
      applications:            '1487990797679857734',
      applicationResults:      '1488279812039774259',

      // ── MDT / ERLC ───────────────────────────────────────────
      mdt:                     '1488603761520807966',
      erlcMisc:                '1488137026220982432',

      // ── Moderation ──────────────────────────────────────────
      verification:            '1488275213379567636',
      support:                 '1487892817669001346',
      banAppeals:              '1487892898174210150',

      // ── Rules ───────────────────────────────────────────────
      discordRules:            '1487889324434522152',
      gameRules:               '1487889453027426489',
      leoRules:                '1487889559327998073',
      fdRules:                 '1487889719189700849',
      dotRules:                '1487889806477492406',
      policeCodes:             '1488387226025857044',
      iaHandbook:              '1491804573394931912',

      // ── Community / public ───────────────────────────────────
      announcements:           '1487917734665912390',
      serverAnnouncements:     '1489583595063345152',
      sessionAnnouncements:    '1488537466783797420',
      sneakPeeks:              '1487960481917440142',
      selfRoles:               '1488603443760332904',
      general:                 '1487899655219056800',
      gameChat:                '1487899727491235902',
      media:                   '1487899802573471774',
      suggestions:             '1487899954008559797',
      memes:                   '1489107100843118752',
      welcome:                 '1488345719961288906',
      commands:                '1488200566210560200',
      deptUpdates:             '1488200620350378154',
      giveaway:                '1490138847097651352',
      supporter:               '1489835629691801611',
      whitelistChat:           '1491926924291997920',
      partnerships:            '1418616953878089931',
      partnershipRequirements: '1418621107799593111',

      // ── Live game feeds ─────────────────────────────────────
      // Set to dedicated channels if created; currently all using MDT
      wantedWall:    '1488603761520807966',
      crimeTicker:   '1488603761520807966',
      mapChannel:    '1488603761520807966',
      vouchBoard:    '1488603443760332904',
      scenarioBoard: '1488332986867777606',
      cityReport:    '1488332986867777606',
      inGameReports: '1488200620350378154',
    },

    roles: {
      // ── Ownership ────────────────────────────────────────────
      owner:               '1419691048468349109',
      coOwner:             '1488159864692674824',
      ownershipAssist:     '1488159949635850240',
      ownershipTeam:       '1488160033941491772',
      seniorHighRank:      '1488496578590150736',
      highRank:            '1488496646198267995',

      // ── Management ───────────────────────────────────────────
      headManagement:      '1492293432897568798',
      seniorManagement:    '1492293511897415882',
      trialManagement:     '1492293584366604368',
      managementTeam:      '1491907328885260551',

      // ── Directive (server leadership) ────────────────────────
      serverDirector:      '1488194100586090566',
      deputyDirector:      '1488194152641593354',
      directiveAdvisor:    '1488194203010728097',
      assistDirector:      '1488194263618424852',
      communityHandler:    '1488195210919018536',

      // ── Internal Affairs ─────────────────────────────────────
      iaDirector:          '1488192871239520327',
      internalAffairs:     '1488192933638180965',
      trialIA:             '1488193005415567621',

      // ── Game Staff ───────────────────────────────────────────
      staffSupervisor:     '1488195819545825512',
      staffTrainer:        '1488195889699881085',
      headAdmin:           '1488196031337463878',
      seniorAdmin:         '1488196434045177946',
      administrator:       '1488196516475834448',
      trialAdmin:          '1488196587313172590',
      headModerator:       '1488197200172548250',
      seniorMod:           '1488197391445131435',
      moderator:           '1488197450618507344',
      trialMod:            '1488197512144879687',
      gameStaff:           '1488502230498934935',    // FSRP | Game Staff (generic role)
      onDutyStaff:         '1488139167698260059',
      staffOfWeek:         '1488207883970810030',
      staffLOA:            '1488198945405534320',
      applicationReviewer: '1488138755947626730',

      // ── Discord Staff ────────────────────────────────────────
      discordStaff:        '1488502325852242031',
      discordMod:          '1488327504824631338',
      trialDiscordMod:     '1488327697879928842',

      // ── Staff status ─────────────────────────────────────────
      staffBlacklisted:    '1492698942692003870',
      underInvestigation:  '1488193066014871672',
      suspendedStaff:      '1492699166567301251',
      formerStaff:         '1490350495565479986',
      formerDiscordStaff:  '1493227293085270087',

      // ── Media Team ───────────────────────────────────────────
      leadMedia:           '1488135751983038557',
      mediaOfWeek:         '1488135902688444528',
      srMedia:             '1488136071370768385',
      mediaTeam:           '1488138471444058202',
      jrMedia:             '1488138660678471750',
      trialMedia:          '1492639014803734699',
      contentCreator:      '1488191434128490497',

      // ── Events / Community ───────────────────────────────────
      eventsHoster:        '1489782758275289260',

      // ── Partnerships ─────────────────────────────────────────
      partnershipMember:   '1491947630702629036',
      partnershipHandler:  '1491947541292515452',
      partnershipOverseer: '1492699880450166784',
      entertainmentMgmt:   '1490516364593598638',

      // ── In-game department roles ─────────────────────────────
      leo:                 '1488726480320987348',
      fireDept:            '1488726384011378729',
      dot:                 '1488726582985232475',
      swat:                '1491609375515738224',
      civilian:            '1488726710483685417',
      irlFD:               '1490417679012728952',

      // ── Whitelist / verification ─────────────────────────────
      whiteListed:         '1490041719574630674',
      verified:            '1420056125813952523',
      unverified:          '1420031201112096769',

      // ── Donator / VIP ────────────────────────────────────────
      serverBooster:       '1488191563958849617',
      megaDonator:         '1488191623782203542',
      donator:             '1488191664269951146',
      serverVIP:           '1488191723598381086',

      // ── Ping roles ───────────────────────────────────────────
      announcementPing:    '1424765964993429514',
      sessionPing:         '1488273501147103433',
      ssuPing:             '1488726213592748073',
      giveawayPing:        '1424766065128378388',
      mediaPing:           '1424766193356767334',
    },

    // ── Role group helpers ────────────────────────────────────
    get staffRoles() {
      const r = this.roles;
      return [
        r.owner, r.coOwner, r.ownershipTeam, r.ownershipAssist,
        r.seniorHighRank, r.highRank,
        r.headManagement, r.seniorManagement, r.trialManagement, r.managementTeam,
        r.serverDirector, r.deputyDirector, r.directiveAdvisor, r.assistDirector,
        r.communityHandler, r.iaDirector,
        r.staffSupervisor, r.staffTrainer,
        r.headAdmin, r.seniorAdmin, r.administrator, r.trialAdmin,
        r.headModerator, r.seniorMod, r.moderator, r.trialMod,
        r.gameStaff,
        r.discordStaff, r.discordMod, r.trialDiscordMod,
      ].filter(Boolean);
    },

    get managementRoles() {
      const r = this.roles;
      return [
        r.owner, r.coOwner, r.ownershipTeam, r.ownershipAssist,
        r.seniorHighRank, r.highRank,
        r.headManagement, r.seniorManagement, r.trialManagement, r.managementTeam,
        r.serverDirector, r.deputyDirector, r.directiveAdvisor, r.assistDirector,
        r.communityHandler, r.iaDirector,
      ].filter(Boolean);
    },

    get hrRoles() {
      const r = this.roles;
      return [
        r.owner, r.coOwner,
        r.headManagement, r.seniorManagement,
        r.serverDirector, r.deputyDirector,
        r.communityHandler,
      ].filter(Boolean);
    },

    // ── MDT emergency ping map ────────────────────────────────
    mdtPings: {
      'Police':  ['1488726480320987348'],
      'Fire':    ['1488726384011378729'],
      'EMS':     ['1488726384011378729'],
      'DOT':     ['1488726582985232475'],
      'Sheriff': ['1488726480320987348'],
      'SWAT':    ['1488726480320987348', '1491609375515738224', '1488726213592748073'],
    },

    // ── Application system ────────────────────────────────────
    approvalRoles: {
      gamestaff: 'trialAdmin',
      mod:       'trialDiscordMod',
      media:     'trialMedia',
      whitelist: 'whiteListed',
    },

    applicationCategories: [
      { id: 'gamestaff', label: 'Game Staff Team',    emoji: '🎮', description: 'Moderate and manage in-game as part of the Game Staff Team.' },
      { id: 'mod',       label: 'Discord Moderator',  emoji: '🛡️', description: 'Moderate the Florida State Roleplay Discord server.' },
      { id: 'media',     label: 'Media Team',         emoji: '📸', description: 'Create content, clips, and graphics for FSRP.' },
      { id: 'whitelist', label: 'Server Whitelist',   emoji: '✅', description: 'Apply for whitelist access to Florida State Roleplay private servers.' },
    ],

    applicationQuestions: {
      gamestaff: [
        { id: 'q1',  label: 'Tell us about yourself and your experience in Roblox roleplay.' },
        { id: 'q2',  label: 'Why do you want to join the Game Staff Team at FSRP?' },
        { id: 'q3',  label: 'What does "Game Staff Team" mean to you? How is it different from Discord moderation?' },
        { id: 'q4',  label: 'How many hours per week can you commit to being in-game and on duty?' },
        { id: 'q5',  label: 'Describe a situation where you handled a difficult player or conflict.' },
        { id: 'q6',  label: 'A player is mass RDMing. Walk us through your step-by-step response.' },
        { id: 'q7',  label: 'Another staff member is abusing their commands. How do you handle it?' },
        { id: 'q8',  label: 'What is the most important quality of a game staff member?' },
        { id: 'q9',  label: 'Do you have experience with ERLC? What commands do you know?' },
        { id: 'q10', label: 'A player files a false report against you. How do you respond?' },
        { id: 'q11', label: 'How do you handle burnout or stress from moderating?' },
        { id: 'q12', label: 'What would you do if you saw a supervisor breaking the rules?' },
        { id: 'q13', label: 'What sets you apart from other applicants?' },
        { id: 'q14', label: 'Do you have any questions for us?' },
        { id: 'q15', label: 'Type "I AGREE" to confirm all your answers are honest and your own.' },
      ],
      mod: [
        { id: 'q1',  label: 'Tell us about yourself and your Discord moderation experience.' },
        { id: 'q2',  label: 'Why do you want to be a Discord Moderator for FSRP?' },
        { id: 'q3',  label: 'How is Discord moderation different from game moderation?' },
        { id: 'q4',  label: 'How many hours per week can you actively be on Discord?' },
        { id: 'q5',  label: 'A member posts slurs in general chat. What do you do?' },
        { id: 'q6',  label: 'Two members are having a heated argument. How do you de-escalate?' },
        { id: 'q7',  label: 'You suspect a user is ban-evading. How do you confirm and respond?' },
        { id: 'q8',  label: 'Another moderator is misusing their power. What steps do you take?' },
        { id: 'q9',  label: 'How do you handle a false report filed against you?' },
        { id: 'q10', label: 'A member DMs you asking to reverse their ban. How do you respond?' },
        { id: 'q11', label: 'What is the biggest challenge in Discord moderation?' },
        { id: 'q12', label: 'How would you handle a raid or mass-join attack?' },
        { id: 'q13', label: 'What previous moderation or leadership roles have you held?' },
        { id: 'q14', label: 'Any questions for the team?' },
        { id: 'q15', label: 'Type "I AGREE" to confirm all your answers are honest and your own.' },
      ],
      media: [
        { id: 'q1',  label: 'Tell us about yourself and your content creation experience.' },
        { id: 'q2',  label: 'Why do you want to join the FSRP Media Team?' },
        { id: 'q3',  label: 'What kind of content would you create for FSRP?' },
        { id: 'q4',  label: 'What software do you use to create and edit content?' },
        { id: 'q5',  label: 'How many hours per week can you dedicate to creating content?' },
        { id: 'q6',  label: 'Share a link to any previous work you have created (optional).' },
        { id: 'q7',  label: 'How do you handle criticism of your creative work?' },
        { id: 'q8',  label: 'What makes FSRP content unique compared to other RP servers?' },
        { id: 'q9',  label: 'How would you promote FSRP to grow the community?' },
        { id: 'q10', label: 'Describe your turnaround time for a 60-second clip from raw footage.' },
        { id: 'q11', label: 'What is your availability — days and hours you are most active?' },
        { id: 'q12', label: 'Have you worked on a media team before? Describe your role.' },
        { id: 'q13', label: 'What is your creative vision for the FSRP brand online?' },
        { id: 'q14', label: 'Any questions for the team?' },
        { id: 'q15', label: 'Type "I AGREE" to confirm all your answers are honest and your own.' },
      ],
      whitelist: [
        { id: 'q1',  label: 'What is your Roblox username and how long have you played ERLC?' },
        { id: 'q2',  label: 'How did you find out about Florida State Roleplay?' },
        { id: 'q3',  label: 'What type of roleplay do you enjoy most in ERLC (LEO, Fire/EMS, civilian, criminal, etc.)?' },
        { id: 'q4',  label: 'Have you been whitelisted or staff in any other ERLC server? If so, which ones?' },
        { id: 'q5',  label: 'Why do you want to join Florida State Roleplay specifically?' },
        { id: 'q6',  label: 'Describe what realistic roleplay means to you and how you apply it.' },
        { id: 'q7',  label: 'A fellow player breaks a major RP rule. What do you do?' },
        { id: 'q8',  label: 'How do you handle situations where roleplay becomes heated or personal?' },
        { id: 'q9',  label: 'What is FailRP and can you give an example of it?' },
        { id: 'q10', label: 'How often are you able to be active in the FSRP server each week?' },
        { id: 'q11', label: 'Have you ever been banned from an ERLC server? Be honest — explain if so.' },
        { id: 'q12', label: 'What do you bring to the Florida State Roleplay community?' },
        { id: 'q13', label: 'Describe a memorable roleplay scenario you have been a part of.' },
        { id: 'q14', label: 'Do you have any questions for the FSRP team?' },
        { id: 'q15', label: 'Type "I AGREE" to confirm all your answers are truthful and your own.' },
      ],
    },

    // ERLC map coordinate bounds
    mapCoords: { minX: -3500, maxX: 3500, minZ: -3500, maxZ: 3500 },
    mapImageUrl: '',

      // ── Staff Server (private HR server) ────────────────────────────────────
      staffGuildId: '1493047504533459066',

      // Maps each application category ID → the specific channel in the staff server
      // where HR review embeds (with Approve/Deny buttons) are posted.
      // Staff server roles that are allowed to approve/deny/hold applications.
      // Add/remove role IDs here as your staff server structure changes.
      staffServerReviewerRoles: [
        '1493257946896007349',   // FSRP | Ownership
        '1493939601801347072',   // FSRP | Directive
        '1493939238058725577',   // FSRP | IA Key
        '1493939091384045648',   // FSRP | HR Key
        '1493938451177799680',   // FSRP | Application Review Key
      ],

      staffAppChannels: {
        gamestaff: '1493264146744213544',   // #game-staff-apps
        mod:       '1493264187865174118',   // #discord-staff-apps
        media:     '1493264379934806209',   // #media-team-apps
        whitelist: '1493264222178644131',   // #whitelist-apps
      },
    };
  