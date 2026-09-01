// Full Book of Mormon Graph Explorer - Client-Facing Card & Traversal Engine
(() => {
  const state = {
    bundle: null,
    nodes: new Map(),
    edges: new Map(),
    adj: new Map(), // nodeId -> [{ edge, targetNode, role }]
    searchIndex: [],
    currentEntityId: "nephi",
    currentTab: "overview",
    filterCategory: "ALL",
    history: ["nephi"],
    currentBook: "1 Nephi"
  };

  const STARTER_KEYS = [
    "nephi",
    "lehi",
    "alma-the-younger",
    "abinadi",
    "captain-moroni",
    "mormon",
    "king-benjamin",
    "ammon-son-of-mosiah",
    "samuel-the-lamanite",
    "zarahemla-city",
    "lamanites",
    "nephites",
    "title-of-liberty",
    "brass-plates"
  ];

  const BOOK_NARRATIVES = {
    "1 Nephi": {
      title: "1 Nephi",
      summary: "The departure of Lehi's family from Jerusalem into the wilderness of Arabia, securing the brass plates from Laban, the journey across the desert with the Liahona, Nephi's grand vision of the Tree of Life and the Savior's ministry, the construction of a ship, and the ocean crossing to the promised land.",
      entities: ["nephi", "lehi", "sariah", "laman", "lemuel", "sam", "zoram", "ishmael", "jerusalem", "valley-of-lemuel", "shazer", "bountiful-old-world", "brass-plates", "liahona"],
      moments: [
        { num: 1, title: "Lehi's Prophetic Call & Vision of the Pillar of Fire", verses: "1 Nephi 1:4–15", desc: "Lehi prays for his people; a pillar of fire appears upon a rock, and he is carried away in vision to behold God and receive the book of prophecy.", entity: "lehi" },
        { num: 2, title: "Lehi's Family Departs Jerusalem into the Wilderness", verses: "1 Nephi 2:1–15", desc: "Commanded of the Lord, Lehi leaves his gold, silver, and house, taking his family south along the Red Sea to the Valley of Lemuel.", entity: "lehi" },
        { num: 3, title: "The Sons of Lehi Return for the Brass Plates", verses: "1 Nephi 3:1–4:38", desc: "Nephi declares 'I will go and do.' Led by the Spirit, he slays Laban, secures the sacred records, and brings Zoram with them.", entity: "nephi" },
        { num: 4, title: "Ishmael's Family Joins the Camp", verses: "1 Nephi 7:1–22", desc: "The sons return to Jerusalem a second time to bring Ishmael and his daughters into the wilderness to raise up seed.", entity: "ishmael" },
        { num: 5, title: "Lehi's Dream of the Tree of Life & Iron Rod", verses: "1 Nephi 8:1–38", desc: "Lehi partakes of the fruit of the tree representing God's love, sees the rod of iron, the river of water, and the great and spacious building.", entity: "lehi" },
        { num: 6, title: "Nephi's Expanded Vision of Christ & the Latter Days", verses: "1 Nephi 11:1–14:30", desc: "Nephi beholds the condescension of God, the Savior's mortal ministry, the Twelve Apostles, the Great Apostasy, and the Restoration.", entity: "nephi" },
        { num: 7, title: "The Discovery of the Liahona (The Compass)", verses: "1 Nephi 16:9–32", desc: "Outside Lehi's tent, a curious brass ball of curious workmanship is found, directing their path according to faith and diligence.", entity: "liahona" },
        { num: 8, title: "Nephi Constructs a Ship according to Divine Pattern", verses: "1 Nephi 17:7–18:4", desc: "Nephi is commanded to build a ship. Despite his brothers' mockery, the Lord shocks them with power, and the vessel is finished.", entity: "nephi" },
        { num: 9, title: "Ocean Crossing & Arrival at the Promised Land", verses: "1 Nephi 18:5–25", desc: "During rebellion on the deep, the compass ceases to work until Laman and Lemuel repent. They arrive safely at the promised land.", entity: "nephi" }
      ]
    },
    "2 Nephi": {
      title: "2 Nephi",
      summary: "Lehi's final patriarchal blessings and teachings on agency, the Fall, and the Messiah; the separation of the righteous Nephites from the Lamanites; the establishment of the City of Nephi and construction of the temple; Jacob's sermon on the Infinite Atonement; extensive quotations from Isaiah; and Nephi's concluding testimony on the Doctrine of Christ.",
      entities: ["nephi", "lehi", "jacob-brother-of-nephi", "joseph-son-of-lehi", "laman", "nephites", "lamanites", "city-of-nephi"],
      moments: [
        { num: 1, title: "Lehi's Discourse on Agency, the Fall, and the Messiah", verses: "2 Nephi 2:1–30", desc: "Lehi instructs Jacob that 'Adam fell that men might be; and men are, that they might have joy,' and that Christ redeems all through His Atonement.", entity: "lehi" },
        { num: 2, title: "Prophecy of Joseph of Egypt regarding Joseph Smith", verses: "2 Nephi 3:1–25", desc: "Lehi blesses his young son Joseph, quoting ancient prophecies of a choice seer in the latter days who would bring forth scripture.", entity: "lehi" },
        { num: 3, title: "The Psalm of Nephi", verses: "2 Nephi 4:15–35", desc: "Following Lehi's death, Nephi laments his weaknesses yet rejoices in God: 'O Lord, I have trusted in thee, and I will trust in thee forever.'", entity: "nephi" },
        { num: 4, title: "Nephites Separate from Lamanites & Build a Temple", verses: "2 Nephi 5:1–25", desc: "Warned of the Lord, Nephi flees into the wilderness with the faithful, settles the Land of Nephi, and builds a temple after Solomon's pattern.", entity: "nephi" },
        { num: 5, title: "Jacob's Great Discourse on the Infinite Atonement", verses: "2 Nephi 9:1–54", desc: "Jacob teaches on resurrection, judgment, paradise, and how the Holy One of Israel delivers mankind from physical and spiritual death.", entity: "jacob-brother-of-nephi" },
        { num: 6, title: "Nephi Expounds the Doctrine of Christ", verses: "2 Nephi 31:1–32:9", desc: "Nephi sets forth the path: faith in Christ, repentance, baptism of water and fire, the gift of the Holy Ghost, and enduring to the end.", entity: "nephi" }
      ]
    },
    "Jacob": {
      title: "Jacob",
      summary: "Jacob assumes spiritual leadership of the Nephites; preaches at the temple against the sins of pride, wealth, and unauthorized polygamy; records the monumental Allegory of the Olive Tree by Zenos; and confounds Sherem the anti-Christ.",
      entities: ["jacob-brother-of-nephi", "enos", "sherem", "nephites", "city-of-nephi"],
      moments: [
        { num: 1, title: "Jacob's Temple Sermon Against Pride & Grosser Crimes", verses: "Jacob 2:1–3:14", desc: "Jacob condemns pride, seeking riches before the kingdom, and unauthorized plural wives: 'This people shall have save it be one wife.'", entity: "jacob-brother-of-nephi" },
        { num: 2, title: "The Allegory of the Tame and Wild Olive Trees", verses: "Jacob 5:1–77", desc: "Zenos's masterwork allegory of the Lord of the vineyard pruning, grafting, scattering, and restoring Israel in the last days.", entity: "jacob-brother-of-nephi" },
        { num: 3, title: "Sherem the Anti-Christ Confounded", verses: "Jacob 7:1–23", desc: "Sherem preaches that there shall be no Christ, demands a sign from Jacob, is struck down by God's power, confesses the truth, and dies.", entity: "jacob-brother-of-nephi" }
      ]
    },
    "Enos": {
      title: "Enos",
      summary: "Enos wrestles in the spirit before God in the forests, prays all day and night for the remission of his sins, receives forgiveness through faith in Christ, and covenants for the preservation of the Lamanites and sacred records.",
      entities: ["enos", "jacob-brother-of-nephi", "lamanites", "nephites"],
      moments: [
        { num: 1, title: "Enos's All-Day and All-Night Prayer for Mercy", verses: "Enos 1:1–8", desc: "Hunting beasts in the forests, the words of his father sink deep into his heart; he prays until voice of the Lord declares his sins forgiven.", entity: "enos" },
        { num: 2, title: "Covenant for the Preservation of the Lamanites", verses: "Enos 1:9–18", desc: "Enos prays with unshakeable faith that the records will be preserved to bring future Lamanites to salvation in the Lord's time.", entity: "enos" }
      ]
    },
    "Jarom": {
      title: "Jarom",
      summary: "Jarom records Nephite defense preparations against frequent Lamanite invasions, the economic prosperity of the people in timber and metals, and how prophets and priests continually labor to keep the people from destruction.",
      entities: ["jarom", "enos", "nephites", "lamanites"],
      moments: [
        { num: 1, title: "Nephite Wars, Industry, and Prophetic Exhortation", verses: "Jarom 1:1–15", desc: "Nephites fortify their cities and make weapons of war; prophets prick their hearts to remember the promised Messiah.", entity: "jarom" }
      ]
    },
    "Omni": {
      title: "Omni",
      summary: "A concise multi-generational chronicle by Omni, Amaron, Chemish, Abinadom, and Amaleki; records Mosiah I being warned to flee Nephi, discovering the people of Zarahemla (Mulekites), translating the Jaredite stone of Coriantumr, and delivering the plates to King Benjamin.",
      entities: ["omni", "amaleki", "mosiah-i", "king-benjamin", "coriantumr-last-jaredite", "zarahemla-city", "mulekites"],
      moments: [
        { num: 1, title: "Mosiah I Flees Nephi & Discovers Zarahemla", verses: "Omni 1:12–19", desc: "Warned by revelation, Mosiah leads the righteous through the wilderness, discovers the people of Zarahemla, and unites both nations.", entity: "mosiah-i" },
        { num: 2, title: "Translation of the Large Stone of Coriantumr", verses: "Omni 1:20–22", desc: "A stone is brought with engravings; Mosiah interprets by the gift of God, revealing the demise of the ancient Jaredite nation.", entity: "mosiah-i" },
        { num: 3, title: "Amaleki Yields the Sacred Plates to King Benjamin", verses: "Omni 1:23–30", desc: "Having no seed, Amaleki delivers the small plates to King Benjamin, exhorting all men to come unto Christ and offer their whole souls.", entity: "amaleki" }
      ]
    },
    "Words of Mormon": {
      title: "Words of Mormon",
      summary: "Mormon's editorial bridge explaining why he included the Small Plates of Nephi with his abridgment for a wise purpose known only to God, and detailing King Benjamin's righteous reign in subduing false prophets and Lamanite incursions.",
      entities: ["mormon", "king-benjamin", "nephites", "zarahemla-city"],
      moments: [
        { num: 1, title: "Mormon Connects the Small Plates for a Wise Purpose", verses: "Words of Mormon 1:1–11", desc: "Guided by the Spirit, Mormon includes Nephi's small plates intact, foreseeing their necessity centuries later in the divine plan.", entity: "mormon" },
        { num: 2, title: "King Benjamin Establishes Peace with the Sword of Laban", verses: "Words of Mormon 1:12–18", desc: "Benjamin wields the sword of Laban against Lamanite armies and puts down false Christs, establishing holy order in Zarahemla.", entity: "king-benjamin" }
      ]
    },
    "Mosiah": {
      title: "Mosiah",
      summary: "King Benjamin's profound coronation sermon from the tower; Zeniff's expedition to reclaim the land of Lehi-Nephi; the wicked reign of King Noah and martyrdom of Abinadi; Alma the Elder establishing the Church at the Waters of Mormon; the miraculous conversion of Alma the Younger and the sons of Mosiah; and the transition from kings to the Reign of the Judges.",
      entities: ["king-benjamin", "mosiah-ii", "zeniff", "noah-king", "abinadi", "alma-the-elder", "alma-the-younger", "ammon-son-of-mosiah", "waters-of-mormon", "zarahemla-city"],
      moments: [
        { num: 1, title: "King Benjamin's Tower Address to the Multitude", verses: "Mosiah 2:1–5:15", desc: "Benjamin gathers all families to the temple, teaches the joyful news of Christ's Atonement, and covenants the nation to Christ.", entity: "king-benjamin" },
        { num: 2, title: "Zeniff's Colony & Noah's Wicked Reign", verses: "Mosiah 9:1–11:29", desc: "Zeniff establishes a colony in Nephi; his son Noah leads the people into idolatry, building lavish palaces and taxing the poor.", entity: "noah-king" },
        { num: 3, title: "Abinadi's Trial, Testimony, and Martyrdom by Fire", verses: "Mosiah 12:1–17:20", desc: "Abinadi stands before Noah's priests, expounds Isaiah 53 and the resurrection of Christ, and is burned at the stake as a martyr.", entity: "abinadi" },
        { num: 4, title: "Alma Baptizes Believers at the Waters of Mormon", verses: "Mosiah 18:1–35", desc: "Alma flees to the Waters of Mormon, teaches the covenant of baptism: 'to bear one another's burdens,' and organizes Christ's Church.", entity: "alma-the-elder" },
        { num: 5, title: "Deliverance of Limhi and Alma to Zarahemla", verses: "Mosiah 21:1–24:25", desc: "Both colonies are enslaved by Lamanites and Amulon; the Lord lightens their burdens, puts the guards to sleep, and leads them home.", entity: "alma-the-elder" },
        { num: 6, title: "Miraculous Conversion of Alma the Younger & Sons of Mosiah", verses: "Mosiah 27:1–37", desc: "While seeking to destroy the Church, an angel appears with thunder, striking Alma dumb until he is born of God.", entity: "alma-the-younger" },
        { num: 7, title: "Establishment of the Reign of the Judges", verses: "Mosiah 29:1–47", desc: "Mosiah proposes abolishing kingship to ensure equal voice of the people; Alma the Younger is chosen as first Chief Judge.", entity: "mosiah-ii" }
      ]
    },
    "Alma": {
      title: "Alma",
      summary: "The longest and most eventful book: Nehor's execution for priestcraft and murder; Amlici's insurrection; Alma's missionary journeys to Zarahemla, Gideon, Melek, and Ammonihah; the martyrdom by fire in Ammonihah and miraculous fall of the prison; the miraculous missions of the Sons of Mosiah among the Lamanites; the conversion of Lamoni and his father; the Anti-Nephi-Lehies' covenant of peace; the confrontation with Korihor; the Zoramite mission and Alma 32 sermon on faith; Alma's sacred commandments to his sons; Captain Moroni and the Title of Liberty; the epic Nephite-Lamanite wars; Helaman and the 2,060 stripling warriors; and the building of ships by Hagoth.",
      entities: ["alma-the-younger", "amulek", "nehor", "amlici", "ammon-son-of-mosiah", "aaron-son-of-mosiah", "king-lamoni", "anti-nephi-lehies", "korihor", "captain-moroni", "helaman-son-of-alma", "pahoran", "stripling-warriors", "hagoth", "zarahemla-city", "ammonihah", "waters-of-sebus"],
      moments: [
        { num: 1, title: "Nehor Slays Gideon & is Executed on Hill Manti", verses: "Alma 1:1–15", desc: "Nehor introduces priestcraft, slays the righteous patriot Gideon with the sword, and is condemned to death under the law.", entity: "nehor" },
        { num: 2, title: "Ammonihah Rejects Alma; Prison Walls Collapse", verses: "Alma 8:1–14:29", desc: "Alma and Amulek preach in wicked Ammonihah; after seeing believers burned in fire, the prison walls fall by earthquake.", entity: "alma-the-younger" },
        { num: 3, title: "Ammon Defends King Lamoni's Flocks at Sebus", verses: "Alma 17:1–19:36", desc: "Ammon serves as a servant, defends the king's sheep with sling and sword, and converts King Lamoni and his whole household.", entity: "ammon-son-of-mosiah" },
        { num: 4, title: "Anti-Nephi-Lehies Bury Their Weapons of War", verses: "Alma 24:1–27:28", desc: "Converted Lamanites covenant never to stain their swords again, burying their weapons deep in the earth as a pledge of peace.", entity: "anti-nephi-lehies" },
        { num: 5, title: "Korihor the Anti-Christ is Struck Dumb", verses: "Alma 30:1–60", desc: "Korihor argues that no man can know of Christ; Alma testifies, Korihor demands a sign, is struck dumb, and is trampled by Zoramites.", entity: "alma-the-younger" },
        { num: 6, title: "Alma's Sermon on Faith and the Word as a Seed", verses: "Alma 32:1–43", desc: "Preaching to the poor Zoramites cast out of synagogues, Alma compares the word of God to a seed planted in the heart.", entity: "alma-the-younger" },
        { num: 7, title: "Captain Moroni Raises the Title of Liberty", verses: "Alma 46:11–37", desc: "Moroni tears his coat, inscribes the standard of liberty for God, freedom, and family, rallying the people against Amalickiah.", entity: "captain-moroni" },
        { num: 8, title: "Helaman's 2,060 Stripling Warriors in Battle", verses: "Alma 56:1–58:41", desc: "The young sons of the Anti-Nephi-Lehies fight with miraculous courage; not one soul perishes because of their unshakeable faith.", entity: "stripling-warriors" },
        { num: 9, title: "Moroni & Pahoran Cleanse the Government & Retake Cities", verses: "Alma 60:1–62:52", desc: "Moroni writes a passionate epistle to Pahoran; discovering the king-men rebellion, they unite to liberate the Nephite nation.", entity: "captain-moroni" }
      ]
    },
    "Helaman": {
      title: "Helaman",
      summary: "The assassination of Pahoran II by Kishkumen; the rise of the Gadianton robbers and secret combinations; Nephi and Lehi surrounded by heavenly fire in prison, converting thousands; Nephi's garden tower sermon uncovering the murder of Seezoram; Nephi receiving the sealing power of God; and Samuel the Lamanite prophesying Christ's birth and death from the walls of Zarahemla.",
      entities: ["helaman-son-of-helaman", "nephi-son-of-helaman", "lehi-son-of-helaman", "kishkumen", "gadianton", "seezoram", "aminadab", "samuel-the-lamanite", "zarahemla-city"],
      moments: [
        { num: 1, title: "Pahoran II Murdered by Kishkumen & Secret Bands", verses: "Helaman 1:1–2:14", desc: "Kishkumen assassinates the Chief Judge on the judgment seat, forming the secret band that would later be led by Gadianton.", entity: "kishkumen" },
        { num: 2, title: "Nephi and Lehi Encircled by Pillars of Fire in Prison", verses: "Helaman 5:1–52", desc: "Imprisoned by Lamanites, Nephi and Lehi are surrounded by heavenly fire, hear a still small voice, and convert eight thousand souls.", entity: "nephi-son-of-helaman" },
        { num: 3, title: "Nephi's Garden Tower Sermon & Revelation of Murder", verses: "Helaman 7:1–9:41", desc: "Nephi laments on his tower, prophesies the secret murder of Chief Judge Seezoram by his brother Seantum, and is vindicated.", entity: "nephi-son-of-helaman" },
        { num: 4, title: "Nephi Given the Sealing Power with God", verses: "Helaman 10:1–11:38", desc: "For unwearyingness, God grants Nephi power to bind on earth and in heaven; Nephi requests a famine to humble the people.", entity: "nephi-son-of-helaman" },
        { num: 5, title: "Samuel the Lamanite Prophesies upon the City Wall", verses: "Helaman 13:1–16:25", desc: "Forbidden to enter Zarahemla, Samuel climbs the wall, prophesying signs of Christ's birth in five years and signs of His crucifixion.", entity: "samuel-the-lamanite" }
      ]
    },
    "3 Nephi": {
      title: "3 Nephi",
      summary: "The sign of Christ's birth fulfilled with a day, a night, and a day without darkness; the united defense under Lachoneus and Gidgiddoni against Giddianhi's robbers; the total collapse of the government into tribes; the horrific tempests, earthquakes, fires, and three days of vapor of darkness at Christ's death; the voice of Christ proclaiming His identity; the personal ministry of the Resurrected Lord at the temple in Bountiful, healing all, blessing children, giving the sacrament, and calling the Twelve Apostles.",
      entities: ["nephi-son-of-nephi", "lachoneus", "gidgiddoni", "giddianhi", "jesus-christ", "twelve-disciples", "three-nephites", "bountiful-temple", "zarahemla-city"],
      moments: [
        { num: 1, title: "The Night Without Darkness Signs the Savior's Birth", verses: "3 Nephi 1:1–26", desc: "As believers face execution from unbelievers, Nephi prays; the sun sets, but there is no darkness, fulfilling Samuel's prophecy.", entity: "nephi-son-of-nephi" },
        { num: 2, title: "Gidgiddoni Defeats the Gadianton Armies", verses: "3 Nephi 3:1–4:33", desc: "Lachoneus and Gidgiddoni gather all people with seven years of supplies, crushing the robber armies when they attack.", entity: "gidgiddoni" },
        { num: 3, title: "Cataclysmic Destructions & 3 Days of Absolute Darkness", verses: "3 Nephi 8:1–10:20", desc: "At Christ's crucifixion, tempests and earthquakes destroy cities; thick darkness covers the land for three days.", entity: "nephi-son-of-nephi" },
        { num: 4, title: "The Voice of Christ from Heaven", verses: "3 Nephi 9:1–10:8", desc: "In the darkness, the voice of the Savior is heard proclaiming: 'I am Jesus Christ the Son of God. I created the heavens and the earth.'", entity: "jesus-christ" },
        { num: 5, title: "The Resurrected Christ Descends at Bountiful Temple", verses: "3 Nephi 11:1–41", desc: "A great multitude at the temple in Bountiful sees the Lord descend in white; 2,500 people feel the wound prints one by one.", entity: "jesus-christ" },
        { num: 6, title: "Christ Heals the Sick and Blesses the Children", verses: "3 Nephi 17:1–25", desc: "Moved with compassion, the Savior heals all afflicted, prays for the multitude, and angels encircle the little children with fire.", entity: "jesus-christ" },
        { num: 7, title: "The Institution of the Sacrament & Translation of the Three", verses: "3 Nephi 18:1–28:40", desc: "Christ administers bread and wine, teaches His gospel, quotes Malachi, and grants three disciples power never to taste of death.", entity: "three-nephites" }
      ]
    },
    "4 Nephi": {
      title: "4 Nephi",
      summary: "Two centuries of utopian peace, complete love, and equality where all things are held in common and there are no Lamanites or Nephites, but all are one in Christ; followed by the gradual return of pride, costly apparel, churches denying Christ, and the revival of secret combinations.",
      entities: ["nephi-son-of-nephi", "amos-i", "amos-ii", "ammaron", "nephites", "lamanites"],
      moments: [
        { num: 1, title: "The Era of Perfect Peace & All Things in Common", verses: "4 Nephi 1:1–23", desc: "The people are all converted; there is no contention, envy, or strife, and miracles abound for over one hundred and fifty years.", entity: "nephites" },
        { num: 2, title: "The Return of Pride, Divisions, and Secret Oaths", verses: "4 Nephi 1:24–49", desc: "Wealth creates class distinctions; churches persecute believers; Ammaron hides the sacred records in Hill Shim.", entity: "ammaron" }
      ]
    },
    "Mormon": {
      title: "Mormon",
      summary: "Mormon's personal chronicle: visited by the Lord at age 15; appointed supreme commander of Nephite armies; witnessing the sorrowful downward spiral of an unrepentant nation; retrieving the plates from Hill Shim; the final catastrophic battle at Hill Cumorah where hundreds of thousands fall; and Mormon's heartbreaking lamentation over his fallen people.",
      entities: ["mormon", "moroni-son-of-mormon", "ammaron", "cumorah-hill", "nephites", "lamanites"],
      moments: [
        { num: 1, title: "Mormon Visited by the Lord at Age 15", verses: "Mormon 1:1–2:2", desc: "Ammaron selects young Mormon to preserve the records; Mormon tastes of the goodness of Jesus and is made general of the armies.", entity: "mormon" },
        { num: 2, title: "Nephite Sorrows and Refusal to Repent", verses: "Mormon 2:3–5:24", desc: "Mormon sees his people mourn with the sorrowing of the damned; he refuses to lead them when they swear vengeance.", entity: "mormon" },
        { num: 3, title: "The Final Annihilation at Hill Cumorah", verses: "Mormon 6:1–22", desc: "At Cumorah, 230,000 Nephite soldiers fall in one catastrophic battle. Mormon cries: 'O ye fair ones, how is it that ye could have fallen!'", entity: "mormon" },
        { num: 4, title: "Moroni Survives Alone to Complete the Record", verses: "Mormon 8:1–9:37", desc: "Moroni alone survives the slaughter, testifying to future generations that 'God is a God of miracles.'", entity: "moroni-son-of-mormon" }
      ]
    },
    "Ether": {
      title: "Ether",
      summary: "Moroni's abridgment of the twenty-four gold plates of the Jaredites: the Jaredite language preserved at the Tower of Babel; the Brother of Jared seeing the premortal Savior on Mount Shelem; eight airtight barges crossing the great sea; generations of Jaredite kings, rebellions, and secret oaths of Akish; the prophet Ether preaching from a cave; and the final mutual annihilation of Shiz and Coriantumr.",
      entities: ["ether", "brother-of-jared", "jared-jaredite", "coriantumr-last-jaredite", "shiz", "akish", "shelem-mount", "jaredites"],
      moments: [
        { num: 1, title: "Jaredites Preserved at the Tower of Babel", verses: "Ether 1:33–43", desc: "The Lord preserves the language of Jared and his brother, promising to lead them to a choice land above all other lands.", entity: "brother-of-jared" },
        { num: 2, title: "Brother of Jared Beholds the Premortal Christ", verses: "Ether 3:1–28", desc: "On Mount Shelem, the Lord touches sixteen stones with His finger; the Brother of Jared sees the premortal body of Christ.", entity: "brother-of-jared" },
        { num: 3, title: "Eight Barges Cross the Ocean to the Promised Land", verses: "Ether 6:1–12", desc: "For 344 days, the airtight barges are driven across the fierce deep with glowing stones providing light inside.", entity: "brother-of-jared" },
        { num: 4, title: "Rise of Secret Combinations under Akish", verses: "Ether 8:1–9:12", desc: "The daughter of Jared dances before Akish, reviving ancient secret oaths that bring destruction upon the Jaredite nation.", entity: "akish" },
        { num: 5, title: "Ether's Prophecy and the Last Battle of Shiz & Coriantumr", verses: "Ether 12:1–15:34", desc: "Ether preaches faith in a cave; after millions fall, Coriantumr slays Shiz, stands alone, and Ether hides the records.", entity: "ether" }
      ]
    },
    "Moroni": {
      title: "Moroni",
      summary: "Moroni's final farewell and sacred instructions: ordinances of ordination, sacrament prayers on the bread and wine, baptism and church order, Mormon's profound discourses on faith, hope, and charity, and the baptism of little children, concluding with Moroni's eternal promise to all who read the Book of Mormon.",
      entities: ["moroni-son-of-mormon", "mormon", "jesus-christ", "nephites"],
      moments: [
        { num: 1, title: "Moroni Wanders Alone for the Safety of His Life", verses: "Moroni 1:1–4", desc: "Wandering where he can lest the Lamanites slay him for not denying Christ, Moroni writes a few more precious things.", entity: "moroni-son-of-mormon" },
        { num: 2, title: "Sacred Sacrament Prayers Given to the Church", verses: "Moroni 4:1–5:2", desc: "The exact prayers on the bread and the wine: 'that they may always have his Spirit to be with them.'", entity: "moroni-son-of-mormon" },
        { num: 3, title: "Mormon's Sermon on Faith, Hope, and Charity", verses: "Moroni 7:1–48", desc: "Mormon preaches that 'charity is the pure love of Christ, and it endureth forever,' exhorting all to pray to be filled with it.", entity: "mormon" },
        { num: 4, title: "Mormon Condemns the Baptism of Little Children", verses: "Moroni 8:1–30", desc: "Mormon writes to Moroni that infant baptism is a solemn mockery before God, for little children are alive in Christ.", entity: "mormon" },
        { num: 5, title: "Moroni's Final Exhortation and Promise", verses: "Moroni 10:3–34", desc: "Moroni's eternal invitation: 'Ask God, the Eternal Father, in the name of Christ, if these things are not true... and he will manifest the truth of it unto you, by the power of the Holy Ghost.'", entity: "moroni-son-of-mormon" }
      ]
    }
  };

  async function init() {
    try {
      const res = await fetch("./data/graph-bundle.json");
      if (!res.ok) throw new Error("Failed to load graph bundle");
      const bundle = await res.json();
      state.bundle = bundle;

      // Index nodes
      (bundle.nodes || []).forEach(n => {
        state.nodes.set(n.id, n);
        state.adj.set(n.id, []);
      });

      // Index edges & build bidirectional adjacency
      (bundle.edges || []).forEach(e => {
        state.edges.set(e.id, e);
        if (state.nodes.has(e.source) && state.nodes.has(e.target)) {
          const sNode = state.nodes.get(e.source);
          const tNode = state.nodes.get(e.target);
          state.adj.get(e.source).push({ edge: e, targetNode: tNode, role: "target" });
          state.adj.get(e.target).push({ edge: e, targetNode: sNode, role: "source" });
        }
      });

      state.searchIndex = bundle.search_index || [];

      // Update header counts
      document.getElementById("meta-entities-count").textContent = `${state.nodes.size.toLocaleString()} Entities`;
      document.getElementById("meta-edges-count").textContent = `${state.edges.size.toLocaleString()} Verified Connections`;

      // Render Starters
      renderStarterList();

      // Check URL param or default
      const params = new URLSearchParams(window.location.search);
      const urlEntity = params.get("entity");
      if (urlEntity && state.nodes.has(urlEntity)) {
        selectEntity(urlEntity, false);
      } else {
        selectEntity("nephi", false);
      }

      // Bind UI handlers
      bindEvents();

      // Render Book Narratives
      renderBookNarrative("1 Nephi");

    } catch (err) {
      console.error("Explorer init error:", err);
    }
  }

  function getEntityKindBadgeClass(type) {
    switch (type) {
      case "PERSON": return "badge-person";
      case "PLACE": return "badge-place";
      case "EVENT": return "badge-event";
      case "GROUP": return "badge-group";
      default: return "badge-person";
    }
  }

  function renderStarterList() {
    const listEl = document.getElementById("starter-list");
    listEl.innerHTML = "";

    const validNodes = [];
    if (state.filterCategory === "ALL") {
      STARTER_KEYS.forEach(k => {
        if (state.nodes.has(k)) validNodes.push(state.nodes.get(k));
      });
    } else {
      for (const node of state.nodes.values()) {
        if (node.type === state.filterCategory && (node.phase1_classification === "MVP_MAJOR" || node.mention_count > 10)) {
          validNodes.push(node);
          if (validNodes.length >= 16) break;
        }
      }
    }

    validNodes.forEach(node => {
      const item = document.createElement("div");
      item.className = `entity-nav-item ${node.id === state.currentEntityId ? 'selected' : ''}`;
      item.innerHTML = `
        <div>
          <div>${node.display_name || node.label || node.id}</div>
          <small style="color: #8c9794; font-size: 0.68rem;">${node.first_locator || ''}</small>
        </div>
        <span class="type-badge ${getEntityKindBadgeClass(node.type)}">${node.type}</span>
      `;
      item.onclick = () => selectEntity(node.id);
      listEl.appendChild(item);
    });
  }

  function selectEntity(id, pushHistory = true) {
    if (!state.nodes.has(id)) {
      const hit = state.searchIndex.find(s => s.id === id || (s.aliases && s.aliases.includes(id)));
      if (hit && state.nodes.has(hit.id)) id = hit.id;
      else return;
    }

    state.currentEntityId = id;
    if (pushHistory && state.history[state.history.length - 1] !== id) {
      state.history.push(id);
      if (state.history.length > 8) state.history.shift();
    }

    renderBreadcrumbs();
    renderProfile();
    renderStarterList();
  }

  function renderBreadcrumbs() {
    const trailEl = document.getElementById("breadcrumbs");
    trailEl.innerHTML = '<span onclick="window.historyBack()">‹ Back</span>';
    state.history.forEach((histId, idx) => {
      const node = state.nodes.get(histId);
      if (!node) return;
      const isCurrent = idx === state.history.length - 1;
      const span = document.createElement("span");
      span.className = isCurrent ? "current" : "";
      span.textContent = node.display_name || node.id;
      if (!isCurrent) span.onclick = () => selectEntity(histId);
      trailEl.appendChild(span);
      if (!isCurrent) {
        const sep = document.createElement("b");
        sep.textContent = "→";
        trailEl.appendChild(sep);
      }
    });
  }

  window.historyBack = () => {
    if (state.history.length > 1) {
      state.history.pop();
      const prev = state.history[state.history.length - 1];
      selectEntity(prev, false);
    }
  };

  function renderProfile() {
    const node = state.nodes.get(state.currentEntityId);
    if (!node) return;

    // Type Badge & Title
    const badgeEl = document.getElementById("profile-type-badge");
    badgeEl.className = `type-badge ${getEntityKindBadgeClass(node.type)}`;
    badgeEl.textContent = node.type;

    document.getElementById("profile-name").textContent = node.display_name || node.label || node.id;
    
    const locatorsEl = document.getElementById("profile-locators");
    if (node.first_locator && node.last_locator) {
      locatorsEl.textContent = node.first_locator === node.last_locator ? node.first_locator : `${node.first_locator} – ${node.last_locator}`;
      locatorsEl.style.display = "inline-block";
    } else {
      locatorsEl.style.display = "none";
    }

    // Neighbors collection
    const connections = state.adj.get(node.id) || [];
    const people = [];
    const events = [];
    const places = [];
    const groups = [];
    const verses = new Set();

    connections.forEach(conn => {
      const t = conn.targetNode;
      if (t.type === "PERSON") people.push(conn);
      else if (t.type === "EVENT") events.push(conn);
      else if (t.type === "PLACE") places.push(conn);
      else if (t.type === "GROUP") groups.push(conn);

      if (conn.edge.scripture_locators) {
        conn.edge.scripture_locators.forEach(l => verses.add(l));
      }
    });

    // Update stats counters
    document.getElementById("stat-people").textContent = people.length;
    document.getElementById("stat-events").textContent = events.length;
    document.getElementById("stat-places").textContent = places.length;
    document.getElementById("stat-groups").textContent = groups.length;
    document.getElementById("stat-verses").textContent = verses.size || (node.mention_count || 1);

    // Render active tab content
    renderTabContent(node, { people, events, places, groups, verses: Array.from(verses) });
  }

  function renderTabContent(node, lists) {
    const container = document.getElementById("tab-content");
    container.innerHTML = "";

    if (state.currentTab === "overview") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Narrative Overview & Key Connections</h4>
          <span>${lists.people.length} People · ${lists.events.length} Events</span>
        </div>
        <div style="background: #fbfdfc; border: 1px solid #e2e8e5; border-radius: 20px; padding: 22px; margin-bottom: 24px;">
          <p style="font: 500 1.15rem/1.6 Literata, Georgia, serif; color: #172421; margin: 0 0 12px;">
            ${node.display_name} appears in the sacred record across <b>${lists.verses.length || (node.mention_count || 1)} passages</b>, directly participating in <b>${lists.events.length} narrative events</b>.
          </p>
          <div style="font-size: 0.8rem; color: #6e7a76;">
            Classification: <b>${node.phase1_classification || 'Documented Entity'}</b> · Identity Status: <b>${node.identity_status || 'VERIFIED'}</b>
          </div>
        </div>
        
        <div class="card-section-heading">
          <h4>Immediate Key Connections</h4>
          <span style="cursor: pointer; color: var(--brand2); font-weight: 800;" onclick="window.setTab('people')">View all people →</span>
        </div>
        <div class="connected-grid" style="margin-bottom: 24px;">
          ${lists.people.slice(0, 4).map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No direct interpersonal connections recorded.</div>'}
        </div>

        <div class="card-section-heading">
          <h4>Prominent Narrative Events</h4>
          <span style="cursor: pointer; color: var(--brand2); font-weight: 800;" onclick="window.setTab('events')">View full timeline →</span>
        </div>
        <div class="timeline-stream">
          ${lists.events.slice(0, 3).map(conn => createTimelineCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No direct event moments recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "people") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>All Connected People (${lists.people.length})</h4>
          <span>Click any character to open their record</span>
        </div>
        <div class="connected-grid">
          ${lists.people.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No connected people.</div>'}
        </div>
      `;
    } else if (state.currentTab === "events") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Chronological Narrative Events (${lists.events.length})</h4>
          <span>Click any event to explore its participants</span>
        </div>
        <div class="timeline-stream">
          ${lists.events.map(conn => createTimelineCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No chronological events recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "places") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Associated Places & Geography (${lists.places.length})</h4>
          <span>Lands, cities, waters, and sacred locations</span>
        </div>
        <div class="connected-grid">
          ${lists.places.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No associated geographic locations.</div>'}
        </div>
      `;
    } else if (state.currentTab === "groups") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Connected Groups & Peoples (${lists.groups.length})</h4>
          <span>Tribes, religious bodies, and factions</span>
        </div>
        <div class="connected-grid">
          ${lists.groups.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No group affiliations recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "verses") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Scripture References (${lists.verses.length})</h4>
          <span>Passages grounding these connections</span>
        </div>
        <div class="scripture-list">
          ${lists.verses.map(v => `<div class="scripture-badge">${v}</div>`).join('') || '<div class="scripture-badge">' + (node.first_locator || '1 Nephi') + '</div>'}
        </div>
      `;
    }
  }

  function createConnectionCardHtml(conn) {
    const t = conn.targetNode;
    const edge = conn.edge;
    const relLabel = edge.ui_label || edge.relationship_type || (edge.canonical_claim ? 'canonical claim' : 'scripture context');
    return `
      <div class="connection-card" onclick="window.selectEntityById('${t.id}')">
        <div>
          <div class="connection-card-top">
            <strong>${t.display_name || t.id}</strong>
            <span class="type-badge ${getEntityKindBadgeClass(t.type)}">${t.type}</span>
          </div>
          <div class="connection-reason">${relLabel}</div>
        </div>
        <div class="connection-locators">
          ${edge.scripture_locators && edge.scripture_locators.length ? edge.scripture_locators.slice(0, 2).join(', ') : (t.first_locator || 'Passage reference')}
        </div>
      </div>
    `;
  }

  function createTimelineCardHtml(conn) {
    const t = conn.targetNode;
    const edge = conn.edge;
    const locators = edge.scripture_locators && edge.scripture_locators.length ? edge.scripture_locators.join(', ') : (t.first_locator || 'Scripture locator');
    return `
      <div class="timeline-moment-card" onclick="window.selectEntityById('${t.id}')">
        <small>${locators}</small>
        <strong>${t.display_name || t.id}</strong>
        <p>${edge.meaning || 'Direct participation in narrative moment.'}</p>
      </div>
    `;
  }

  window.selectEntityById = (id) => {
    selectEntity(id);
    const workbench = document.getElementById("workbench");
    if (workbench) workbench.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.setTab = (tab) => {
    state.currentTab = tab;
    document.querySelectorAll("#profile-tabs button").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    document.querySelectorAll(".stat-box").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    renderProfile();
  };

  function bindEvents() {
    // Search input
    const searchInput = document.getElementById("search-input");
    const searchDropdown = document.getElementById("search-dropdown");

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        searchDropdown.classList.remove("open");
        return;
      }

      const hits = state.searchIndex.filter(item => {
        if (state.filterCategory !== "ALL" && item.type !== state.filterCategory) return false;
        return item.tokens.some(tok => tok.includes(q)) || (item.display_name && item.display_name.toLowerCase().includes(q));
      }).slice(0, 10);

      if (hits.length === 0) {
        searchDropdown.innerHTML = '<div style="padding: 12px 16px; color: #8c9794; font-size: 0.84rem;">No matching entities found.</div>';
      } else {
        searchDropdown.innerHTML = hits.map(hit => `
          <div class="search-result-item" onclick="window.selectFromSearch('${hit.id}')">
            <b>${hit.display_name || hit.id}</b>
            <span class="type-badge ${getEntityKindBadgeClass(hit.type)}">${hit.type}</span>
          </div>
        `).join('');
      }
      searchDropdown.classList.add("open");
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove("open");
      }
    });

    window.selectFromSearch = (id) => {
      searchInput.value = "";
      searchDropdown.classList.remove("open");
      selectEntity(id);
    };

    // Filter pills
    document.querySelectorAll("#filter-pills button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filter-pills button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.filterCategory = btn.getAttribute("data-filter");
        renderStarterList();
      });
    });

    // Profile tabs
    document.querySelectorAll("#profile-tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        window.setTab(btn.getAttribute("data-tab"));
      });
    });

    // Stat boxes
    document.querySelectorAll(".stat-box").forEach(box => {
      box.addEventListener("click", () => {
        window.setTab(box.getAttribute("data-tab"));
      });
    });

    // Book pills in narrative section
    document.querySelectorAll(".book-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".book-pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentBook = btn.getAttribute("data-book");
        renderBookNarrative(state.currentBook);
      });
    });
  }

  function renderBookNarrative(bookName) {
    const data = BOOK_NARRATIVES[bookName] || BOOK_NARRATIVES["1 Nephi"];
    const box = document.getElementById("book-content-box");

    // Gather active entities for this book
    const entityChips = (data.entities || []).map(k => {
      const node = state.nodes.get(k);
      if (!node) return '';
      return `
        <button class="entity-chip-btn" onclick="window.selectEntityById('${node.id}')">
          <span class="type-badge ${getEntityKindBadgeClass(node.type)}" style="font-size: 0.55rem; padding: 2px 6px;">${node.type}</span>
          <span>${node.display_name || node.id}</span>
        </button>
      `;
    }).join('');

    box.innerHTML = `
      <div class="book-header-banner">
        <small>BOOK OF MORMON · NARRATIVE TIMELINE</small>
        <h3>${data.title}</h3>
        <p>${data.summary}</p>
      </div>

      ${entityChips ? `
      <div class="book-entities-section">
        <h5>Key Active Entities in ${data.title}</h5>
        <div class="entity-chips-grid">
          ${entityChips}
        </div>
      </div>
      ` : ''}

      <div style="font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; color: var(--sage); margin-bottom: 18px;">
        Chronological Narrative Moments (${data.moments.length} Events)
      </div>
      <div class="timeline-stream">
        ${data.moments.map(m => `
          <div class="timeline-moment-card" onclick="window.selectEntityById('${m.entity}')">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <small>${m.verses}</small>
              <span style="font-size: 0.7rem; color: var(--brand2); font-weight: 700;">Inspect in Workbench ↑</span>
            </div>
            <strong>${m.num}. ${m.title}</strong>
            <p>${m.desc}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.addEventListener("DOMContentLoaded", init);
})();
