// ── Element Lore ──────────────────────────────────────────────────────────────
// Etymology, discovery history, and (where genuine) alchemical tradition for
// all 118 elements. Alchemy fields are only present for elements with a real
// classical/alchemical heritage — no invented symbols.

export interface ElementLore {
  /** One line on the origin of the element's name. */
  etymology: string;
  /** 1–3 sentences of real discovery / usage history. */
  history: string;
  /** Alchemical meaning — only for elements with genuine alchemical tradition. */
  alchemy?: string;
  /** Unicode alchemical / planetary symbol, where one truly exists. */
  alchemySymbol?: string;
}

export const ELEMENT_LORE: Record<string, ElementLore> = {
  H: {
    etymology: "Greek hydro + genes, 'water-former' — it burns to make water.",
    history: "Henry Cavendish isolated it in 1766 and called it 'inflammable air'; Lavoisier later named it hydrogen after showing that burning it produces water.",
  },
  He: {
    etymology: "Greek helios, 'the Sun' — where it was first seen.",
    history: "Detected in 1868 as an unknown yellow line in the Sun's spectrum during an eclipse (Janssen and Lockyer) — the first element found off Earth. William Ramsay isolated it on Earth in 1895 from uranium ore.",
  },
  Li: {
    etymology: "Greek lithos, 'stone' — it was found in a mineral, unlike the plant-ash alkalis.",
    history: "Discovered by Johan August Arfwedson in 1817 while analysing the mineral petalite in Berzelius's laboratory. The pure metal was isolated soon after by electrolysis.",
  },
  Be: {
    etymology: "From beryl, the gemstone (Greek beryllos) in which it was found.",
    history: "Identified as a new 'earth' in beryl and emerald by Louis-Nicolas Vauquelin in 1798; the metal was first isolated in 1828 by Wöhler and Bussy independently.",
  },
  B: {
    etymology: "From borax, its ancient ore — Arabic buraq, via Persian burah.",
    history: "Borax had been used for centuries as a flux before Gay-Lussac, Thénard, and (independently) Humphry Davy isolated impure boron in 1808.",
  },
  C: {
    etymology: "Latin carbo, 'charcoal'.",
    history: "Known since prehistory as charcoal and soot; Lavoisier showed in the 1770s that diamond and charcoal are the same element by burning both to the same gas.",
    alchemy: "Charcoal fed every alchemical furnace — the humble black matter from which fire, and the whole Great Work, began.",
  },
  N: {
    etymology: "Greek nitron + genes, 'niter-forming' — it forms saltpetre.",
    history: "Daniel Rutherford isolated it in 1772 as the 'noxious air' left when a candle and a mouse had exhausted the breathable part of air.",
  },
  O: {
    etymology: "Greek oxys + genes, 'acid-former' — Lavoisier wrongly believed all acids contained it.",
    history: "Discovered independently by Carl Wilhelm Scheele (c. 1771) and Joseph Priestley (1774); Lavoisier used it to overthrow the phlogiston theory and found modern chemistry.",
  },
  F: {
    etymology: "Latin fluere, 'to flow' — fluorspar was used as a smelting flux.",
    history: "So violently reactive that it injured or killed several chemists who tried to isolate it; Henri Moissan finally succeeded in 1886 using electrolysis, earning a Nobel Prize.",
  },
  Ne: {
    etymology: "Greek neos, 'new'.",
    history: "Discovered by William Ramsay and Morris Travers in 1898 by fractionally distilling liquid air. Its crimson discharge glow made the first 'neon' signs in the 1910s.",
  },
  Na: {
    etymology: "English soda; the symbol Na is from Latin natrium, via Egyptian natron.",
    history: "Humphry Davy isolated the soft, flammable metal in 1807 by passing electric current through molten caustic soda — one of the first triumphs of electrolysis.",
  },
  Mg: {
    etymology: "From Magnesia, a district in Thessaly, Greece, rich in magnesium minerals.",
    history: "Recognised as distinct from lime in 1755 by Joseph Black; Humphry Davy isolated the metal by electrolysis in 1808.",
  },
  Al: {
    etymology: "Latin alumen, 'alum' — the bitter salt used since antiquity for dyeing.",
    history: "First isolated by Hans Christian Ørsted in 1825. It was once more precious than gold — Napoleon III served honoured guests on aluminium plates — until cheap electrolytic production arrived in 1886.",
  },
  Si: {
    etymology: "Latin silex, 'flint'.",
    history: "Jöns Jacob Berzelius isolated pure silicon in 1824. A century later it became the foundation of the transistor and the entire electronics age.",
  },
  P: {
    etymology: "Greek phosphoros, 'light-bearer' — it glows in the dark.",
    history: "Discovered in 1669 by the alchemist Hennig Brand, who boiled down vast quantities of urine hunting for the philosopher's stone — the first element whose discoverer is known by name.",
    alchemy: "Brand's glowing 'cold fire' electrified the alchemical world: a substance that shone without burning seemed proof that captured light — perhaps the stone itself — lay within matter.",
  },
  S: {
    etymology: "Latin sulpur; known in scripture as brimstone, 'burning stone'.",
    history: "Burned since antiquity to fumigate homes and bleach cloth; Lavoisier established it as an element in 1777. Vulcanisation of rubber (1839) made it industrially indispensable.",
    alchemy: "One of the alchemists' tria prima: Sulfur was the principle of combustibility and the soul — the fiery, active male essence that with Mercury engendered all metals.",
    alchemySymbol: "🜍",
  },
  Cl: {
    etymology: "Greek chloros, 'yellow-green', for its colour.",
    history: "Carl Wilhelm Scheele prepared the gas in 1774 but thought it a compound; Humphry Davy proved it an element in 1810. Chlorinated drinking water has since saved millions of lives.",
  },
  Ar: {
    etymology: "Greek argos, 'idle' or 'lazy' — it reacts with nothing.",
    history: "Discovered in 1894 by Lord Rayleigh and William Ramsay, who noticed atmospheric nitrogen was mysteriously denser than nitrogen from chemicals — the first noble gas found, earning both men Nobel Prizes.",
  },
  K: {
    etymology: "English potash, 'pot ashes'; the symbol K is from Latin kalium, via Arabic al-qalyah.",
    history: "Isolated by Humphry Davy in 1807 by electrolysing molten potash — the first metal ever obtained by electricity. Davy reportedly danced around the lab when the globules ignited.",
  },
  Ca: {
    etymology: "Latin calx, 'lime' — quicklime has been burned from limestone since Roman times.",
    history: "Lime and gypsum were used in Roman mortar and plaster for millennia before Humphry Davy isolated the metal itself by electrolysis in 1808.",
  },
  Sc: {
    etymology: "Latin Scandia, 'Scandinavia'.",
    history: "Discovered by Lars Fredrik Nilson in 1879; it matched 'eka-boron', the element Mendeleev had predicted from a gap in his periodic table — a famous vindication of the table.",
  },
  Ti: {
    etymology: "Named for the Titans of Greek mythology.",
    history: "Found by clergyman William Gregor in 1791 in black Cornish sand; Martin Klaproth independently found it in 1795 and gave it its mythic name. Pure titanium was not produced at scale until the 1940s.",
  },
  V: {
    etymology: "Named for Vanadis, a name of the Norse goddess Freyja, for its beautifully coloured compounds.",
    history: "Discovered by Andrés Manuel del Río in Mexico in 1801, but he was talked out of his claim; Nils Gabriel Sefström rediscovered it in 1830 and the name stuck.",
  },
  Cr: {
    etymology: "Greek chroma, 'colour' — its compounds span the rainbow.",
    history: "Discovered by Louis-Nicolas Vauquelin in 1797 in the mineral crocoite. Chromium gives rubies their red and emeralds their green, and stainless steel its shine.",
  },
  Mn: {
    etymology: "From Latin magnes via the black mineral magnesia negra (pyrolusite).",
    history: "Pyrolusite was used by ancient glassmakers to decolourise glass; Johan Gottlieb Gahn isolated the metal in 1774 after Scheele recognised it as a new element.",
  },
  Fe: {
    etymology: "Old English iren; the symbol Fe is from Latin ferrum.",
    history: "Worked from meteorites before smelting was invented; the Iron Age began around 1200 BCE when furnaces grew hot enough to win iron from ore. It remains the backbone of civilisation as steel.",
    alchemy: "Iron belonged to Mars ♂ — god of war — the hard, aggressive metal of blades and blood. Alchemists noted that 'Mars' dissolved in acids with violent spirit.",
    alchemySymbol: "♂",
  },
  Co: {
    etymology: "German kobold, 'goblin' — miners blamed spirits for ores that yielded no copper and gave off poisonous fumes.",
    history: "Georg Brandt identified it around 1735, the first metal discovered since antiquity. Cobalt blue had already coloured glass and ceramics for thousands of years, from Egypt to Ming China.",
  },
  Ni: {
    etymology: "German Kupfernickel, 'devil's copper' — another ore that cheated miners.",
    history: "Isolated by Axel Fredrik Cronstedt in 1751 from the deceptive ore niccolite. Earth's core is largely iron and nickel.",
  },
  Cu: {
    etymology: "Latin cuprum, from aes Cyprium — 'metal of Cyprus', the Roman world's copper island.",
    history: "One of the first metals ever worked, from about 9000 BCE; alloying it with tin around 3300 BCE launched the Bronze Age. Its conductivity now wires the modern world.",
    alchemy: "Copper was the metal of Venus ♀ — goddess of beauty and love — for its warm lustre and its birthplace on Cyprus, the island sacred to her.",
    alchemySymbol: "♀",
  },
  Zn: {
    etymology: "German Zink, possibly from Zinke, 'prong' — for the jagged form of the smelted metal.",
    history: "Zinc was smelted at scale in India and China centuries before Andreas Marggraf's 1746 isolation established it in European chemistry. Brass — copper plus zinc — is far older still.",
    alchemy: "Paracelsus named it zincum; alchemists knew its white oxide as lana philosophica, 'philosopher's wool', the woolly snow that formed when zinc burned.",
  },
  Ga: {
    etymology: "Latin Gallia, 'France' — the discoverer's homeland.",
    history: "Discovered spectroscopically by Paul-Émile Lecoq de Boisbaudran in 1875, matching Mendeleev's predicted 'eka-aluminium' almost exactly. The metal melts in the palm of your hand.",
  },
  Ge: {
    etymology: "Latin Germania, 'Germany'.",
    history: "Discovered by Clemens Winkler in 1886, fulfilling Mendeleev's prediction of 'eka-silicon'. It powered the first transistors before silicon took over.",
  },
  As: {
    etymology: "Greek arsenikon, the yellow pigment orpiment, ultimately from Persian zarnikh.",
    history: "Its sulfide ores were known to the ancients; the medieval scholar Albertus Magnus is traditionally credited with first isolating the element around 1250. For centuries it was the poisoner's weapon of choice — 'inheritance powder'.",
    alchemy: "A staple of the alchemist's cabinet: orpiment and realgar, its golden and ruby sulfides, promised colour transmutations, and its vapours were feared as a corrosive spirit.",
    alchemySymbol: "🜺",
  },
  Se: {
    etymology: "Greek selene, 'the Moon' — named as companion to tellurium, the Earth.",
    history: "Discovered by Jöns Jacob Berzelius in 1817 in the sludge of a sulfuric acid works. Its light-dependent conductivity later enabled early photocells and photocopiers.",
  },
  Br: {
    etymology: "Greek bromos, 'stench'.",
    history: "Isolated by 23-year-old Antoine Balard in 1826 from Mediterranean salt-marsh brine — one of only two elements liquid at room temperature.",
  },
  Kr: {
    etymology: "Greek kryptos, 'hidden'.",
    history: "Found by Ramsay and Travers in 1898 in the residue of evaporated liquid air. From 1960 to 1983 the metre was officially defined by the orange light of krypton-86.",
  },
  Rb: {
    etymology: "Latin rubidus, 'deep red' — the colour of its spectral lines.",
    history: "Discovered by Bunsen and Kirchhoff in 1861 with their newly invented spectroscope, in the mineral lepidolite. Rubidium clocks help keep GPS time.",
  },
  Sr: {
    etymology: "From Strontian, the Scottish village where its mineral was found.",
    history: "Recognised as a new earth by Adair Crawford in 1790; Humphry Davy isolated the metal in 1808. Its salts burn crimson — the red of signal flares and fireworks.",
  },
  Y: {
    etymology: "From Ytterby, a Swedish village whose quarry named four elements.",
    history: "Johan Gadolin analysed a heavy black mineral from Ytterby in 1794 and found the first rare-earth element, opening a chapter of chemistry that took a century to untangle.",
  },
  Zr: {
    etymology: "From zircon, via Persian zargun, 'gold-coloured'.",
    history: "Identified in zircon by Martin Klaproth in 1789; Berzelius obtained impure metal in 1824. Its transparency to neutrons makes it cladding for nuclear fuel rods.",
  },
  Nb: {
    etymology: "Named for Niobe, daughter of Tantalus — it is chemically twinned with tantalum.",
    history: "Discovered by Charles Hatchett in 1801 in a mineral from America and first called columbium; the name niobium was internationally adopted in 1949. Its superconducting alloys wind MRI magnets.",
  },
  Mo: {
    etymology: "Greek molybdos, 'lead' — its ore molybdenite was long mistaken for lead ore or graphite.",
    history: "Scheele showed molybdenite contained a new element in 1778; Peter Jacob Hjelm isolated the metal in 1781. It hardens the armour steels of the modern age.",
  },
  Tc: {
    etymology: "Greek technetos, 'artificial' — the first element made by humans.",
    history: "Created in 1937 by Emilio Segrè and Carlo Perrier in molybdenum foil bombarded in Berkeley's cyclotron, filling periodic-table gap 43. Technetium-99m is now medicine's workhorse imaging isotope.",
  },
  Ru: {
    etymology: "Latin Ruthenia, 'Russia'.",
    history: "Discovered in 1844 by Karl Ernst Claus at Kazan University in the residues of Ural platinum ore.",
  },
  Rh: {
    etymology: "Greek rhodon, 'rose' — its salts dissolve rose-red.",
    history: "Discovered by William Hyde Wollaston in 1803 while processing crude platinum. Today it is often the most precious metal on Earth, essential to catalytic converters.",
  },
  Pd: {
    etymology: "Named for the asteroid Pallas, discovered just the year before.",
    history: "Discovered by Wollaston in 1803; he initially sold it anonymously through a shop, letting sceptics accuse him of fraud before revealing his method. It can absorb hundreds of times its own volume of hydrogen.",
  },
  Ag: {
    etymology: "Old English seolfor; the symbol Ag is from Latin argentum, 'shining white'.",
    history: "Mined since at least 3000 BCE; the silver of Laurion financed classical Athens, and Spanish-American silver reshaped the world economy. Its salts made photography possible.",
    alchemy: "Silver was Luna ☽ — the Moon — gold's pale consort; the second-noblest metal, standing one step below the Sun in the alchemist's ladder of perfection.",
    alchemySymbol: "☽",
  },
  Cd: {
    etymology: "Latin cadmia, the old name for calamine, the zinc ore in which it hides.",
    history: "Discovered by Friedrich Stromeyer in 1817 as a yellow impurity in zinc carbonate. Its brilliant pigments coloured Monet's palette; its toxicity is now tightly controlled.",
  },
  In: {
    etymology: "From the brilliant indigo-blue line in its spectrum.",
    history: "Discovered spectroscopically by Ferdinand Reich and Hieronymous Richter in 1863. As indium tin oxide it forms the invisible conductive layer of every touchscreen.",
  },
  Sn: {
    etymology: "Old English tin; the symbol Sn is from Latin stannum.",
    history: "The metal that made the Bronze Age: from about 3300 BCE tin traded across continents to harden copper. Tinned food cans and solder kept it essential ever after.",
    alchemy: "Tin belonged to Jupiter ♃, the jovial king of planets — a bright, benevolent metal that cried out with a crackling 'tin cry' when bent.",
    alchemySymbol: "♃",
  },
  Sb: {
    etymology: "Latin antimonium, of debated origin; the symbol Sb is from stibium, the ancient eye-paint kohl.",
    history: "Its sulfide darkened eyes in ancient Egypt and Babylon. Renaissance alchemists prized it — the treatise 'The Triumphal Chariot of Antimony' (c. 1604) is devoted entirely to its preparations, some prescribed as medicine.",
    alchemy: "To alchemists antimony was the 'grey wolf' that devours all metals but gold — molten antimony ore swallowed base metals, and so was used to purify gold.",
    alchemySymbol: "♁",
  },
  Te: {
    etymology: "Latin tellus, 'Earth'.",
    history: "Discovered in 1782 by Franz-Joseph Müller von Reichenstein in gold ore from Transylvania; Klaproth confirmed and named it in 1798.",
  },
  I: {
    etymology: "Greek iodes, 'violet-coloured' — for its vapour.",
    history: "Discovered by Bernard Courtois in 1811 when acid added to seaweed ash released violet fumes in his saltpetre works. Iodised salt later ended goitre across much of the world.",
  },
  Xe: {
    etymology: "Greek xenos, 'stranger'.",
    history: "The last of Ramsay and Travers's 1898 noble-gas discoveries from liquid air. In 1962 Neil Bartlett stunned chemists by making the first xenon compound — noble gases were not inert after all.",
  },
  Cs: {
    etymology: "Latin caesius, 'sky-blue' — the colour of its spectral lines.",
    history: "Discovered by Bunsen and Kirchhoff in 1860 — the first element ever found by spectroscopy. Since 1967 the second has been defined by a vibration of the caesium-133 atom.",
  },
  Ba: {
    etymology: "Greek barys, 'heavy' — its minerals are strikingly dense.",
    history: "Scheele identified the new earth baryta in 1774; Humphry Davy isolated the metal by electrolysis in 1808. Bologna stone, a glowing barium mineral, had fascinated natural philosophers since the 1600s.",
  },
  La: {
    etymology: "Greek lanthanein, 'to lie hidden' — it hid inside cerium salts for decades.",
    history: "Extracted from impure cerium nitrate by Carl Gustaf Mosander in 1839. It lends its name to the whole lanthanide series.",
  },
  Ce: {
    etymology: "Named for Ceres, the dwarf planet discovered two years earlier.",
    history: "Discovered in 1803 by Berzelius and Hisinger, and independently by Klaproth. The most abundant rare earth, it sparks in lighter flints and polishes glass.",
  },
  Pr: {
    etymology: "Greek prasios didymos, 'green twin' — for its green salts.",
    history: "In 1885 Carl Auer von Welsbach split the supposed element 'didymium' into two: praseodymium and neodymium.",
  },
  Nd: {
    etymology: "Greek neos didymos, 'new twin'.",
    history: "The other half of didymium, separated by Welsbach in 1885. Neodymium-iron-boron magnets, invented in 1984, are the strongest permanent magnets known.",
  },
  Pm: {
    etymology: "Named for Prometheus, who stole fire from the gods.",
    history: "The last gap among the lighter elements, filled in 1945 at Oak Ridge by Marinsky, Glendenin, and Coryell in uranium fission products. It has no stable isotope and barely exists in nature.",
  },
  Sm: {
    etymology: "From the mineral samarskite, itself named for the Russian mining official Samarsky.",
    history: "Isolated by Lecoq de Boisbaudran in 1879. Samarium-cobalt magnets were the first rare-earth supermagnets.",
  },
  Eu: {
    etymology: "Named for the continent of Europe.",
    history: "Isolated by Eugène-Anatole Demarçay in 1901. Its red glow lit the phosphors of colour television, and its fluorescence guards euro banknotes against forgery.",
  },
  Gd: {
    etymology: "Honours Johan Gadolin, pioneer of rare-earth chemistry.",
    history: "Identified by Jean Charles Galissard de Marignac in 1880. Its strongly magnetic ion is the basis of MRI contrast agents.",
  },
  Tb: {
    etymology: "From Ytterby, the Swedish quarry village — the second of its four elements.",
    history: "Separated from yttria by Carl Gustaf Mosander in 1843.",
  },
  Dy: {
    etymology: "Greek dysprositos, 'hard to get at'.",
    history: "Discovered by Lecoq de Boisbaudran in 1886, though pure samples had to wait for 1950s ion-exchange techniques. It keeps wind-turbine magnets working when hot.",
  },
  Ho: {
    etymology: "Latin Holmia, 'Stockholm'.",
    history: "Discovered in 1878–79 by Per Teodor Cleve, and independently by Delafontaine and Soret via spectroscopy. It has the strongest magnetic moment of any element.",
  },
  Er: {
    etymology: "From Ytterby — the third element named for the village.",
    history: "Separated by Mosander in 1843. Erbium-doped fibre amplifiers boost the light signals that carry the internet across oceans.",
  },
  Tm: {
    etymology: "From Thule, the mythical land at the world's northern edge.",
    history: "Discovered by Per Teodor Cleve in 1879. It is the rarest of the stable rare earths.",
  },
  Yb: {
    etymology: "From Ytterby — the fourth and final element named for the village.",
    history: "Discovered by Jean Charles Galissard de Marignac in 1878.",
  },
  Lu: {
    etymology: "Latin Lutetia, the ancient name of Paris.",
    history: "Isolated in 1907 by Georges Urbain in Paris (and independently by Welsbach, who called it cassiopeium) — the last and hardest of the classical rare earths.",
  },
  Hf: {
    etymology: "Latin Hafnia, 'Copenhagen'.",
    history: "Found in 1923 by Dirk Coster and George de Hevesy in Copenhagen, guided by Niels Bohr's atomic theory, which predicted it would hide in zirconium ores — an early triumph of quantum theory.",
  },
  Ta: {
    etymology: "Named for Tantalus, condemned to thirst: its oxide sits in acid without absorbing any, 'tantalised'.",
    history: "Discovered by Anders Gustaf Ekeberg in 1802. Its inertness makes it ideal for surgical implants and the tiny capacitors in phones.",
  },
  W: {
    etymology: "Swedish tung sten, 'heavy stone'; the symbol W is from its German name Wolfram, after the ore wolframite.",
    history: "Isolated in 1783 by the Spanish brothers Juan José and Fausto Elhuyar. With the highest melting point of any metal, it glowed in incandescent bulb filaments for a century.",
  },
  Re: {
    etymology: "Latin Rhenus, the river Rhine.",
    history: "Discovered in 1925 by Walter Noddack, Ida Tacke, and Otto Berg — the last stable element to be found. Superalloys containing it survive inside jet engines.",
  },
  Os: {
    etymology: "Greek osme, 'smell' — its volatile oxide has a pungent, dangerous odour.",
    history: "Discovered by Smithson Tennant in 1803 in the black residue of dissolved platinum ore. It is the densest naturally occurring element.",
  },
  Ir: {
    etymology: "Named for Iris, goddess of the rainbow, for its vividly coloured salts.",
    history: "Discovered by Tennant in 1803 alongside osmium. A worldwide iridium-rich clay layer provided the key evidence that an asteroid impact ended the age of dinosaurs.",
  },
  Pt: {
    etymology: "Spanish platina, 'little silver' — Spanish colonists first dismissed it as a nuisance.",
    history: "Worked by pre-Columbian peoples of South America long before Antonio de Ulloa brought reports to Europe in the 1740s. Once discarded by gold miners, it now outclasses gold in catalysis and chemistry.",
  },
  Au: {
    etymology: "Old English gold; the symbol Au is from Latin aurum, 'shining dawn'.",
    history: "Treasured by every civilisation that found it — Egyptian goldsmiths worked it 5,000 years ago, and it never tarnishes. It anchored money for millennia and now rides in every electronic connector.",
    alchemy: "Gold was Sol ☉ — the Sun made metal — perfection itself. The whole Great Work of alchemy aimed at it: to 'cure' base metals of their imperfection and transmute them into gold.",
    alchemySymbol: "☉",
  },
  Hg: {
    etymology: "Named for the swift planet Mercury; the symbol Hg is from Greek-Latin hydrargyrum, 'water-silver'.",
    history: "Known to ancient Egypt, India, and China; the first Chinese emperor's tomb was said to hold rivers of it. Its toxicity — the fate of 'mad hatters' — has retired it from thermometers and medicine.",
    alchemy: "Mercury ☿ was the quicksilver messenger — the volatile, feminine spirit of the tria prima. With Sulfur it was believed to compose every metal, and no laboratory of the Art was without it.",
    alchemySymbol: "☿",
  },
  Tl: {
    etymology: "Greek thallos, 'green shoot' — for its bright green spectral line.",
    history: "Discovered spectroscopically by William Crookes in 1861. Colourless, odourless, and lethal, its salts became infamous as 'the poisoner's poison' before being banned.",
  },
  Pb: {
    etymology: "Old English lead; the symbol Pb is from Latin plumbum — the root of 'plumbing'.",
    history: "Smelted for over 6,000 years; Rome plumbed its aqueducts and sweetened its wine with it, poisoning itself in the process. Leaded petrol and paint repeated the mistake before modern bans.",
    alchemy: "Lead was Saturn ♄ — the slow, heavy, melancholy planet — the basest of the seven metals and the traditional starting matter of transmutation: from Saturn's darkness the work climbed toward the Sun.",
    alchemySymbol: "♄",
  },
  Bi: {
    etymology: "German Wismut, of uncertain origin — perhaps weiße Masse, 'white mass'.",
    history: "Known to medieval miners and printers but long confused with lead and tin; Claude Geoffroy the Younger proved it a distinct metal in 1753. Its iridescent 'hopper' crystals are a favourite of collectors.",
    alchemy: "Alchemists and miners knew bismuth as tectum argenti, 'roof of silver' — believing it to be silver still half-formed, caught partway through its slow ripening in the earth.",
  },
  Po: {
    etymology: "Named for Poland, homeland of Marie Curie, then erased from the map by partition.",
    history: "Discovered by Marie and Pierre Curie in 1898 in tonnes of pitchblende residue — the first element found through its radioactivity, and a political statement in its name.",
  },
  At: {
    etymology: "Greek astatos, 'unstable'.",
    history: "Synthesised in 1940 by Corson, MacKenzie, and Segrè at Berkeley's cyclotron. It is the rarest naturally occurring element — perhaps a gram exists in Earth's crust at any moment.",
  },
  Rn: {
    etymology: "From radium — it was first known as 'radium emanation'.",
    history: "Identified by Friedrich Ernst Dorn in 1900 as the radioactive gas escaping radium. Seeping from the ground into basements, it is now recognised as a leading cause of lung cancer after smoking.",
  },
  Fr: {
    etymology: "Named for France.",
    history: "Discovered in 1939 by Marguerite Perey, Marie Curie's former laboratory assistant — the last element to be discovered in nature rather than synthesised.",
  },
  Ra: {
    etymology: "Latin radius, 'ray'.",
    history: "Discovered by the Curies in 1898; Marie Curie isolated the pure metal in 1910. Its glow made luminous watch dials — and the tragedy of the Radium Girls who painted them.",
  },
  Ac: {
    etymology: "Greek aktis, 'ray' or 'beam'.",
    history: "Discovered by André-Louis Debierne in 1899 in the Curies' pitchblende residues. It names the actinide series.",
  },
  Th: {
    etymology: "Named for Thor, the Norse god of thunder.",
    history: "Discovered by Berzelius in 1829. Thorium-laced gas mantles lit streets for decades, and thorium reactors remain a proposed alternative nuclear fuel cycle.",
  },
  Pa: {
    etymology: "'Protactinium' — the parent of actinium, into which it decays.",
    history: "Identified in 1917–18 by Otto Hahn and Lise Meitner (and independently by Soddy and Cranston).",
  },
  U: {
    etymology: "Named for the planet Uranus, discovered just eight years earlier.",
    history: "Identified by Martin Klaproth in 1789 in pitchblende. Becquerel discovered radioactivity through it in 1896, and the 1938 discovery of uranium fission opened the nuclear age.",
  },
  Np: {
    etymology: "Named for Neptune, the planet beyond Uranus.",
    history: "Created by Edwin McMillan and Philip Abelson at Berkeley in 1940 — the first transuranium element, made by bombarding uranium with neutrons.",
  },
  Pu: {
    etymology: "Named for Pluto, then counted the planet beyond Neptune.",
    history: "Synthesised by Glenn Seaborg's team at Berkeley in 1940–41 and kept secret until after the war; plutonium fuelled the Trinity test and the Nagasaki bomb.",
  },
  Am: {
    etymology: "Named for the Americas, mirroring europium one row above.",
    history: "Made by Seaborg's team in 1944 during the Manhattan Project. A speck of americium-241 sits in most household smoke detectors.",
  },
  Cm: {
    etymology: "Honours Marie and Pierre Curie.",
    history: "Synthesised in 1944 by Seaborg, James, and Ghiorso. Curium power sources and instruments have flown on Mars rovers.",
  },
  Bk: {
    etymology: "Named for Berkeley, California, mirroring terbium's village of Ytterby.",
    history: "Created in 1949 by Thompson, Ghiorso, and Seaborg at the University of California, Berkeley.",
  },
  Cf: {
    etymology: "Named for California.",
    history: "Synthesised at Berkeley in 1950. An intense neutron emitter, it is used to start up reactors and probe for hidden materials.",
  },
  Es: {
    etymology: "Honours Albert Einstein.",
    history: "Discovered in 1952 in the radioactive debris of 'Ivy Mike', the first hydrogen-bomb test — its existence was classified until 1955.",
  },
  Fm: {
    etymology: "Honours Enrico Fermi, architect of the first nuclear reactor.",
    history: "Found alongside einsteinium in the fallout of the 1952 Ivy Mike test.",
  },
  Md: {
    etymology: "Honours Dmitri Mendeleev, father of the periodic table.",
    history: "Made at Berkeley in 1955 — the first element synthesised one atom at a time, with just seventeen atoms in the first experiment.",
  },
  No: {
    etymology: "Honours Alfred Nobel.",
    history: "First claimed by a Stockholm team in 1957; the claim failed, but the name survived when Dubna scientists convincingly made it in the 1960s.",
  },
  Lr: {
    etymology: "Honours Ernest Lawrence, inventor of the cyclotron.",
    history: "First produced by Albert Ghiorso's team at Berkeley in 1961; it closes the actinide series.",
  },
  Rf: {
    etymology: "Honours Ernest Rutherford, who first split the atom.",
    history: "Claimed by both Dubna (1964) and Berkeley (1969); the Cold War naming dispute — the 'Transfermium Wars' — was not settled until 1997.",
  },
  Db: {
    etymology: "Named for Dubna, Russia, home of the Joint Institute for Nuclear Research.",
    history: "First synthesised around 1968–70 by teams at Dubna and Berkeley, and long fought over before the 1997 naming settlement.",
  },
  Sg: {
    etymology: "Honours Glenn Seaborg — the first element named for a living person.",
    history: "Synthesised at Berkeley in 1974. Seaborg, co-discoverer of ten elements, called the naming a greater honour than his Nobel Prize.",
  },
  Bh: {
    etymology: "Honours Niels Bohr.",
    history: "First made in 1981 by the GSI laboratory in Darmstadt, Germany, using their 'cold fusion' bombardment technique.",
  },
  Hs: {
    etymology: "Latin Hassia, for the German state of Hesse, home of the GSI laboratory.",
    history: "Synthesised at GSI Darmstadt in 1984 by Münzenberg, Armbruster, and colleagues.",
  },
  Mt: {
    etymology: "Honours Lise Meitner, co-discoverer of nuclear fission — one of the few elements named for a woman.",
    history: "First created at GSI Darmstadt in 1982, one atom at a time.",
  },
  Ds: {
    etymology: "Named for Darmstadt, the German city of its discovery.",
    history: "Synthesised at GSI in 1994.",
  },
  Rg: {
    etymology: "Honours Wilhelm Röntgen, discoverer of X-rays.",
    history: "First made at GSI Darmstadt in December 1994, three atoms at a time.",
  },
  Cn: {
    etymology: "Honours Nicolaus Copernicus, who put the Sun at the centre.",
    history: "Synthesised at GSI Darmstadt in 1996; the name was made official on Copernicus's birthday in 2010.",
  },
  Nh: {
    etymology: "From Nihon, a Japanese name for Japan — 'land of the rising sun'.",
    history: "Created at RIKEN in 2004 after nine years of beam time — the first element discovered in Asia, named in 2016.",
  },
  Fl: {
    etymology: "Named for the Flerov Laboratory at Dubna, honouring physicist Georgy Flyorov.",
    history: "First synthesised in 1998 by the Dubna–Livermore collaboration.",
  },
  Mc: {
    etymology: "Named for Moscow Oblast, home of the Dubna laboratory.",
    history: "First made in 2003 by the Dubna–Livermore collaboration; officially named in 2016.",
  },
  Lv: {
    etymology: "Named for the Lawrence Livermore National Laboratory in California.",
    history: "First synthesised in 2000 in the Dubna–Livermore collaboration.",
  },
  Ts: {
    etymology: "Named for Tennessee, home of Oak Ridge National Laboratory.",
    history: "Created in 2010 by a Russian–American collaboration using berkelium targets flown from Oak Ridge to Dubna; named in 2016.",
  },
  Og: {
    etymology: "Honours Yuri Oganessian, pioneer of superheavy-element synthesis — only the second element named for a living person.",
    history: "First created at Dubna in 2002 and confirmed in 2006; a handful of atoms have ever existed. It completes the seventh row of the periodic table.",
  },
};

export function loreFor(symbol: string): ElementLore | undefined {
  return ELEMENT_LORE[symbol];
}
