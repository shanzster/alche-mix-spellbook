/**
 * The full 118-element periodic table, laid out in the classic "Modern Periodic
 * Table of the Elements" grid (the familiar 18-column chart) — lanthanides and
 * actinides pulled out into their own two rows below the main block.
 *
 * Each element carries its grid position (`xpos` 1..18 = group column, `ypos`
 * 1..7 = period row; lanthanides sit on row 9 and actinides on row 10, with a
 * spacer row 8 between them and the main block) plus its electrons-per-shell so
 * the Bohr / 3D viewers work for every element, not just a curated few.
 */

export type ElementCategory =
  | "Alkali Metal"
  | "Alkaline Earth Metal"
  | "Transition Metal"
  | "Post-transition Metal"
  | "Metalloid"
  | "Nonmetal"
  | "Halogen"
  | "Noble Gas"
  | "Lanthanide"
  | "Actinide";

export interface TableElement {
  number: number;
  symbol: string;
  name: string;
  mass: string;
  category: ElementCategory;
  /** Electrons per shell, e.g. "2,8,14,2". */
  shells: string;
  /** Group column 1..18. */
  xpos: number;
  /** Period row 1..7 (lanthanides = 9, actinides = 10). */
  ypos: number;
  /** Pauling electronegativity; undefined where no accepted value (He, Ne, Ar…). */
  electronegativity?: number;
  /** Melting point in kelvin; undefined where unknown. */
  meltK?: number;
  /** Boiling point in kelvin; undefined where unknown. */
  boilK?: number;
  /** Year of discovery; undefined for elements known since antiquity. */
  discoveryYear?: number;
  /** True for elements known since antiquity (no single discovery year). */
  ancient?: boolean;
}

// Short category codes keep the data table readable; expanded on the way out.
const CAT: Record<string, ElementCategory> = {
  al: "Alkali Metal",
  ae: "Alkaline Earth Metal",
  tm: "Transition Metal",
  pt: "Post-transition Metal",
  ml: "Metalloid",
  nm: "Nonmetal",
  hl: "Halogen",
  ng: "Noble Gas",
  ln: "Lanthanide",
  ac: "Actinide",
};

// [number, symbol, name, mass, catCode, xpos, ypos, shells]
type Row = [number, string, string, string, keyof typeof CAT | string, number, number, string];

const RAW: Row[] = [
  [1, "H", "Hydrogen", "1.008", "nm", 1, 1, "1"],
  [2, "He", "Helium", "4.003", "ng", 18, 1, "2"],
  [3, "Li", "Lithium", "6.94", "al", 1, 2, "2,1"],
  [4, "Be", "Beryllium", "9.012", "ae", 2, 2, "2,2"],
  [5, "B", "Boron", "10.81", "ml", 13, 2, "2,3"],
  [6, "C", "Carbon", "12.011", "nm", 14, 2, "2,4"],
  [7, "N", "Nitrogen", "14.007", "nm", 15, 2, "2,5"],
  [8, "O", "Oxygen", "15.999", "nm", 16, 2, "2,6"],
  [9, "F", "Fluorine", "18.998", "hl", 17, 2, "2,7"],
  [10, "Ne", "Neon", "20.180", "ng", 18, 2, "2,8"],
  [11, "Na", "Sodium", "22.990", "al", 1, 3, "2,8,1"],
  [12, "Mg", "Magnesium", "24.305", "ae", 2, 3, "2,8,2"],
  [13, "Al", "Aluminium", "26.982", "pt", 13, 3, "2,8,3"],
  [14, "Si", "Silicon", "28.085", "ml", 14, 3, "2,8,4"],
  [15, "P", "Phosphorus", "30.974", "nm", 15, 3, "2,8,5"],
  [16, "S", "Sulfur", "32.06", "nm", 16, 3, "2,8,6"],
  [17, "Cl", "Chlorine", "35.45", "hl", 17, 3, "2,8,7"],
  [18, "Ar", "Argon", "39.948", "ng", 18, 3, "2,8,8"],
  [19, "K", "Potassium", "39.098", "al", 1, 4, "2,8,8,1"],
  [20, "Ca", "Calcium", "40.078", "ae", 2, 4, "2,8,8,2"],
  [21, "Sc", "Scandium", "44.956", "tm", 3, 4, "2,8,9,2"],
  [22, "Ti", "Titanium", "47.867", "tm", 4, 4, "2,8,10,2"],
  [23, "V", "Vanadium", "50.942", "tm", 5, 4, "2,8,11,2"],
  [24, "Cr", "Chromium", "51.996", "tm", 6, 4, "2,8,13,1"],
  [25, "Mn", "Manganese", "54.938", "tm", 7, 4, "2,8,13,2"],
  [26, "Fe", "Iron", "55.845", "tm", 8, 4, "2,8,14,2"],
  [27, "Co", "Cobalt", "58.933", "tm", 9, 4, "2,8,15,2"],
  [28, "Ni", "Nickel", "58.693", "tm", 10, 4, "2,8,16,2"],
  [29, "Cu", "Copper", "63.546", "tm", 11, 4, "2,8,18,1"],
  [30, "Zn", "Zinc", "65.38", "tm", 12, 4, "2,8,18,2"],
  [31, "Ga", "Gallium", "69.723", "pt", 13, 4, "2,8,18,3"],
  [32, "Ge", "Germanium", "72.630", "ml", 14, 4, "2,8,18,4"],
  [33, "As", "Arsenic", "74.922", "ml", 15, 4, "2,8,18,5"],
  [34, "Se", "Selenium", "78.971", "nm", 16, 4, "2,8,18,6"],
  [35, "Br", "Bromine", "79.904", "hl", 17, 4, "2,8,18,7"],
  [36, "Kr", "Krypton", "83.798", "ng", 18, 4, "2,8,18,8"],
  [37, "Rb", "Rubidium", "85.468", "al", 1, 5, "2,8,18,8,1"],
  [38, "Sr", "Strontium", "87.62", "ae", 2, 5, "2,8,18,8,2"],
  [39, "Y", "Yttrium", "88.906", "tm", 3, 5, "2,8,18,9,2"],
  [40, "Zr", "Zirconium", "91.224", "tm", 4, 5, "2,8,18,10,2"],
  [41, "Nb", "Niobium", "92.906", "tm", 5, 5, "2,8,18,12,1"],
  [42, "Mo", "Molybdenum", "95.95", "tm", 6, 5, "2,8,18,13,1"],
  [43, "Tc", "Technetium", "98", "tm", 7, 5, "2,8,18,13,2"],
  [44, "Ru", "Ruthenium", "101.07", "tm", 8, 5, "2,8,18,15,1"],
  [45, "Rh", "Rhodium", "102.906", "tm", 9, 5, "2,8,18,16,1"],
  [46, "Pd", "Palladium", "106.42", "tm", 10, 5, "2,8,18,18"],
  [47, "Ag", "Silver", "107.868", "tm", 11, 5, "2,8,18,18,1"],
  [48, "Cd", "Cadmium", "112.414", "tm", 12, 5, "2,8,18,18,2"],
  [49, "In", "Indium", "114.818", "pt", 13, 5, "2,8,18,18,3"],
  [50, "Sn", "Tin", "118.710", "pt", 14, 5, "2,8,18,18,4"],
  [51, "Sb", "Antimony", "121.760", "ml", 15, 5, "2,8,18,18,5"],
  [52, "Te", "Tellurium", "127.60", "ml", 16, 5, "2,8,18,18,6"],
  [53, "I", "Iodine", "126.904", "hl", 17, 5, "2,8,18,18,7"],
  [54, "Xe", "Xenon", "131.293", "ng", 18, 5, "2,8,18,18,8"],
  [55, "Cs", "Caesium", "132.905", "al", 1, 6, "2,8,18,18,8,1"],
  [56, "Ba", "Barium", "137.327", "ae", 2, 6, "2,8,18,18,8,2"],
  [57, "La", "Lanthanum", "138.905", "ln", 3, 9, "2,8,18,18,9,2"],
  [58, "Ce", "Cerium", "140.116", "ln", 4, 9, "2,8,18,19,9,2"],
  [59, "Pr", "Praseodymium", "140.908", "ln", 5, 9, "2,8,18,21,8,2"],
  [60, "Nd", "Neodymium", "144.242", "ln", 6, 9, "2,8,18,22,8,2"],
  [61, "Pm", "Promethium", "145", "ln", 7, 9, "2,8,18,23,8,2"],
  [62, "Sm", "Samarium", "150.36", "ln", 8, 9, "2,8,18,24,8,2"],
  [63, "Eu", "Europium", "151.964", "ln", 9, 9, "2,8,18,25,8,2"],
  [64, "Gd", "Gadolinium", "157.25", "ln", 10, 9, "2,8,18,25,9,2"],
  [65, "Tb", "Terbium", "158.925", "ln", 11, 9, "2,8,18,27,8,2"],
  [66, "Dy", "Dysprosium", "162.500", "ln", 12, 9, "2,8,18,28,8,2"],
  [67, "Ho", "Holmium", "164.930", "ln", 13, 9, "2,8,18,29,8,2"],
  [68, "Er", "Erbium", "167.259", "ln", 14, 9, "2,8,18,30,8,2"],
  [69, "Tm", "Thulium", "168.934", "ln", 15, 9, "2,8,18,31,8,2"],
  [70, "Yb", "Ytterbium", "173.045", "ln", 16, 9, "2,8,18,32,8,2"],
  [71, "Lu", "Lutetium", "174.967", "ln", 17, 9, "2,8,18,32,9,2"],
  [72, "Hf", "Hafnium", "178.49", "tm", 4, 6, "2,8,18,32,10,2"],
  [73, "Ta", "Tantalum", "180.948", "tm", 5, 6, "2,8,18,32,11,2"],
  [74, "W", "Tungsten", "183.84", "tm", 6, 6, "2,8,18,32,12,2"],
  [75, "Re", "Rhenium", "186.207", "tm", 7, 6, "2,8,18,32,13,2"],
  [76, "Os", "Osmium", "190.23", "tm", 8, 6, "2,8,18,32,14,2"],
  [77, "Ir", "Iridium", "192.217", "tm", 9, 6, "2,8,18,32,15,2"],
  [78, "Pt", "Platinum", "195.084", "tm", 10, 6, "2,8,18,32,17,1"],
  [79, "Au", "Gold", "196.967", "tm", 11, 6, "2,8,18,32,18,1"],
  [80, "Hg", "Mercury", "200.592", "tm", 12, 6, "2,8,18,32,18,2"],
  [81, "Tl", "Thallium", "204.38", "pt", 13, 6, "2,8,18,32,18,3"],
  [82, "Pb", "Lead", "207.2", "pt", 14, 6, "2,8,18,32,18,4"],
  [83, "Bi", "Bismuth", "208.980", "pt", 15, 6, "2,8,18,32,18,5"],
  [84, "Po", "Polonium", "209", "pt", 16, 6, "2,8,18,32,18,6"],
  [85, "At", "Astatine", "210", "hl", 17, 6, "2,8,18,32,18,7"],
  [86, "Rn", "Radon", "222", "ng", 18, 6, "2,8,18,32,18,8"],
  [87, "Fr", "Francium", "223", "al", 1, 7, "2,8,18,32,18,8,1"],
  [88, "Ra", "Radium", "226", "ae", 2, 7, "2,8,18,32,18,8,2"],
  [89, "Ac", "Actinium", "227", "ac", 3, 10, "2,8,18,32,18,9,2"],
  [90, "Th", "Thorium", "232.038", "ac", 4, 10, "2,8,18,32,18,10,2"],
  [91, "Pa", "Protactinium", "231.036", "ac", 5, 10, "2,8,18,32,20,9,2"],
  [92, "U", "Uranium", "238.029", "ac", 6, 10, "2,8,18,32,21,9,2"],
  [93, "Np", "Neptunium", "237", "ac", 7, 10, "2,8,18,32,22,9,2"],
  [94, "Pu", "Plutonium", "244", "ac", 8, 10, "2,8,18,32,24,8,2"],
  [95, "Am", "Americium", "243", "ac", 9, 10, "2,8,18,32,25,8,2"],
  [96, "Cm", "Curium", "247", "ac", 10, 10, "2,8,18,32,25,9,2"],
  [97, "Bk", "Berkelium", "247", "ac", 11, 10, "2,8,18,32,27,8,2"],
  [98, "Cf", "Californium", "251", "ac", 12, 10, "2,8,18,32,28,8,2"],
  [99, "Es", "Einsteinium", "252", "ac", 13, 10, "2,8,18,32,29,8,2"],
  [100, "Fm", "Fermium", "257", "ac", 14, 10, "2,8,18,32,30,8,2"],
  [101, "Md", "Mendelevium", "258", "ac", 15, 10, "2,8,18,32,31,8,2"],
  [102, "No", "Nobelium", "259", "ac", 16, 10, "2,8,18,32,32,8,2"],
  [103, "Lr", "Lawrencium", "266", "ac", 17, 10, "2,8,18,32,32,8,3"],
  [104, "Rf", "Rutherfordium", "267", "tm", 4, 7, "2,8,18,32,32,10,2"],
  [105, "Db", "Dubnium", "268", "tm", 5, 7, "2,8,18,32,32,11,2"],
  [106, "Sg", "Seaborgium", "269", "tm", 6, 7, "2,8,18,32,32,12,2"],
  [107, "Bh", "Bohrium", "270", "tm", 7, 7, "2,8,18,32,32,13,2"],
  [108, "Hs", "Hassium", "269", "tm", 8, 7, "2,8,18,32,32,14,2"],
  [109, "Mt", "Meitnerium", "278", "tm", 9, 7, "2,8,18,32,32,15,2"],
  [110, "Ds", "Darmstadtium", "281", "tm", 10, 7, "2,8,18,32,32,17,1"],
  [111, "Rg", "Roentgenium", "282", "tm", 11, 7, "2,8,18,32,32,18,1"],
  [112, "Cn", "Copernicium", "285", "tm", 12, 7, "2,8,18,32,32,18,2"],
  [113, "Nh", "Nihonium", "286", "pt", 13, 7, "2,8,18,32,32,18,3"],
  [114, "Fl", "Flerovium", "289", "pt", 14, 7, "2,8,18,32,32,18,4"],
  [115, "Mc", "Moscovium", "290", "pt", 15, 7, "2,8,18,32,32,18,5"],
  [116, "Lv", "Livermorium", "293", "pt", 16, 7, "2,8,18,32,32,18,6"],
  [117, "Ts", "Tennessine", "294", "hl", 17, 7, "2,8,18,32,32,18,7"],
  [118, "Og", "Oganesson", "294", "ng", 18, 7, "2,8,18,32,32,18,8"],
];

/**
 * Physical properties, indexed by atomic number − 1:
 * [electronegativity (Pauling), meltK, boilK, discoveryYear]
 * `null` = no accepted / known value. discoveryYear 0 = known since antiquity.
 * (Arsenic sublimes: its "boiling" point sits below its pressurised melting
 * point, which the state-of-matter logic handles by checking gas first.)
 */
type PropRow = [number | null, number | null, number | null, number];

const PROPS: PropRow[] = [
  [2.2, 13.99, 20.27, 1766], // 1 H
  [null, null, 4.22, 1868], // 2 He (never solidifies at ambient pressure)
  [0.98, 453.65, 1615, 1817], // 3 Li
  [1.57, 1560, 2742, 1798], // 4 Be
  [2.04, 2349, 4200, 1808], // 5 B
  [2.55, 3800, 4300, 0], // 6 C
  [3.04, 63.15, 77.36, 1772], // 7 N
  [3.44, 54.36, 90.19, 1774], // 8 O
  [3.98, 53.53, 85.03, 1886], // 9 F
  [null, 24.56, 27.1, 1898], // 10 Ne
  [0.93, 370.94, 1156, 1807], // 11 Na
  [1.31, 923, 1363, 1755], // 12 Mg
  [1.61, 933.47, 2743, 1825], // 13 Al
  [1.9, 1687, 3538, 1824], // 14 Si
  [2.19, 317.3, 553.7, 1669], // 15 P
  [2.58, 388.36, 717.8, 0], // 16 S
  [3.16, 171.6, 239.11, 1774], // 17 Cl
  [null, 83.81, 87.3, 1894], // 18 Ar
  [0.82, 336.7, 1032, 1807], // 19 K
  [1.0, 1115, 1757, 1808], // 20 Ca
  [1.36, 1814, 3109, 1879], // 21 Sc
  [1.54, 1941, 3560, 1791], // 22 Ti
  [1.63, 2183, 3680, 1801], // 23 V
  [1.66, 2180, 2944, 1797], // 24 Cr
  [1.55, 1519, 2334, 1774], // 25 Mn
  [1.83, 1811, 3134, 0], // 26 Fe
  [1.88, 1768, 3200, 1735], // 27 Co
  [1.91, 1728, 3186, 1751], // 28 Ni
  [1.9, 1357.77, 2835, 0], // 29 Cu
  [1.65, 692.68, 1180, 1746], // 30 Zn
  [1.81, 302.91, 2673, 1875], // 31 Ga
  [2.01, 1211.4, 3106, 1886], // 32 Ge
  [2.18, 1090, 887, 0], // 33 As (sublimes at 887 K)
  [2.55, 494, 958, 1817], // 34 Se
  [2.96, 265.8, 332, 1826], // 35 Br
  [3.0, 115.78, 119.93, 1898], // 36 Kr
  [0.82, 312.45, 961, 1861], // 37 Rb
  [0.95, 1050, 1655, 1790], // 38 Sr
  [1.22, 1799, 3609, 1794], // 39 Y
  [1.33, 2128, 4682, 1789], // 40 Zr
  [1.6, 2750, 5017, 1801], // 41 Nb
  [2.16, 2896, 4912, 1778], // 42 Mo
  [1.9, 2430, 4538, 1937], // 43 Tc
  [2.2, 2607, 4423, 1844], // 44 Ru
  [2.28, 2237, 3968, 1803], // 45 Rh
  [2.2, 1828.05, 3236, 1803], // 46 Pd
  [1.93, 1234.93, 2435, 0], // 47 Ag
  [1.69, 594.22, 1040, 1817], // 48 Cd
  [1.78, 429.75, 2345, 1863], // 49 In
  [1.96, 505.08, 2875, 0], // 50 Sn
  [2.05, 903.78, 1860, 0], // 51 Sb
  [2.1, 722.66, 1261, 1782], // 52 Te
  [2.66, 386.85, 457.4, 1811], // 53 I
  [2.6, 161.4, 165.03, 1898], // 54 Xe
  [0.79, 301.7, 944, 1860], // 55 Cs
  [0.89, 1000, 2118, 1808], // 56 Ba
  [1.1, 1193, 3737, 1839], // 57 La
  [1.12, 1068, 3716, 1803], // 58 Ce
  [1.13, 1208, 3793, 1885], // 59 Pr
  [1.14, 1297, 3347, 1885], // 60 Nd
  [1.13, 1315, 3273, 1945], // 61 Pm
  [1.17, 1345, 2067, 1879], // 62 Sm
  [1.2, 1099, 1802, 1901], // 63 Eu
  [1.2, 1585, 3546, 1880], // 64 Gd
  [1.2, 1629, 3503, 1843], // 65 Tb
  [1.22, 1680, 2840, 1886], // 66 Dy
  [1.23, 1734, 2993, 1878], // 67 Ho
  [1.24, 1802, 3141, 1843], // 68 Er
  [1.25, 1818, 2223, 1879], // 69 Tm
  [1.1, 1097, 1469, 1878], // 70 Yb
  [1.27, 1925, 3675, 1907], // 71 Lu
  [1.3, 2506, 4876, 1923], // 72 Hf
  [1.5, 3290, 5731, 1802], // 73 Ta
  [2.36, 3695, 5828, 1783], // 74 W
  [1.9, 3459, 5869, 1925], // 75 Re
  [2.2, 3306, 5285, 1803], // 76 Os
  [2.2, 2719, 4701, 1803], // 77 Ir
  [2.28, 2041.4, 4098, 1735], // 78 Pt
  [2.54, 1337.33, 3129, 0], // 79 Au
  [2.0, 234.32, 629.88, 0], // 80 Hg
  [1.62, 577, 1746, 1861], // 81 Tl
  [2.33, 600.61, 2022, 0], // 82 Pb
  [2.02, 544.7, 1837, 0], // 83 Bi
  [2.0, 527, 1235, 1898], // 84 Po
  [2.2, 575, 610, 1940], // 85 At
  [2.2, 202, 211.5, 1900], // 86 Rn
  [0.7, 300, 950, 1939], // 87 Fr
  [0.9, 973, 2010, 1898], // 88 Ra
  [1.1, 1323, 3471, 1899], // 89 Ac
  [1.3, 2023, 5061, 1829], // 90 Th
  [1.5, 1841, 4300, 1913], // 91 Pa
  [1.38, 1405.3, 4404, 1789], // 92 U
  [1.36, 917, 4273, 1940], // 93 Np
  [1.28, 912.5, 3501, 1940], // 94 Pu
  [1.3, 1449, 2880, 1944], // 95 Am
  [1.3, 1613, 3383, 1944], // 96 Cm
  [1.3, 1259, 2900, 1949], // 97 Bk
  [1.3, 1173, 1743, 1950], // 98 Cf
  [1.3, 1133, null, 1952], // 99 Es
  [1.3, 1800, null, 1952], // 100 Fm
  [1.3, 1100, null, 1955], // 101 Md
  [1.3, 1100, null, 1958], // 102 No
  [null, 1900, null, 1961], // 103 Lr
  [null, null, null, 1964], // 104 Rf
  [null, null, null, 1968], // 105 Db
  [null, null, null, 1974], // 106 Sg
  [null, null, null, 1981], // 107 Bh
  [null, null, null, 1984], // 108 Hs
  [null, null, null, 1982], // 109 Mt
  [null, null, null, 1994], // 110 Ds
  [null, null, null, 1994], // 111 Rg
  [null, null, null, 1996], // 112 Cn
  [null, null, null, 2004], // 113 Nh
  [null, null, null, 1999], // 114 Fl
  [null, null, null, 2003], // 115 Mc
  [null, null, null, 2000], // 116 Lv
  [null, null, null, 2010], // 117 Ts
  [null, null, null, 2002], // 118 Og
];

export const PERIODIC_ELEMENTS: TableElement[] = RAW.map(
  ([number, symbol, name, mass, cat, xpos, ypos, shells]) => {
    const [en, meltK, boilK, year] = PROPS[number - 1];
    return {
      number,
      symbol,
      name,
      mass,
      category: CAT[cat as string] ?? "Nonmetal",
      shells,
      xpos,
      ypos,
      electronegativity: en ?? undefined,
      meltK: meltK ?? undefined,
      boilK: boilK ?? undefined,
      discoveryYear: year > 0 ? year : undefined,
      ancient: year === 0 ? true : undefined,
    };
  },
);

export function elementByNumber(n: number): TableElement | undefined {
  return PERIODIC_ELEMENTS.find((e) => e.number === n);
}

/** The two f-block range markers shown in group 3 of the main grid. */
export const FBLOCK_MARKERS = [
  { label: "57–71", category: "Lanthanide" as ElementCategory, xpos: 3, ypos: 6 },
  { label: "89–103", category: "Actinide" as ElementCategory, xpos: 3, ypos: 7 },
];
