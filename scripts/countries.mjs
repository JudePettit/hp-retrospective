// Countries covered by the Political Retrospective, keyed by each state's first Wikidata item (CC0), so no outside
// dataset's numbering is a key here (the free-data rule of 17 November 2026, MP-11). `qids` are the Wikidata items used
// for heads of state and government and elections; historical predecessor states are listed alongside the modern one.
export const COUNTRIES = {
  // North America
  Q30: { name: 'United States', iso3: 'USA', qids: ['Q30'] },
  Q16: { name: 'Canada', iso3: 'CAN', qids: ['Q16'] },
  Q778: { name: 'Bahamas', iso3: 'BHS', qids: ['Q778'] },
  Q241: { name: 'Cuba', iso3: 'CUB', qids: ['Q241'] },
  Q790: { name: 'Haiti', iso3: 'HTI', qids: ['Q790'] },
  Q786: { name: 'Dominican Republic', iso3: 'DOM', qids: ['Q786'] },
  Q766: { name: 'Jamaica', iso3: 'JAM', qids: ['Q766'] },
  Q754: { name: 'Trinidad and Tobago', iso3: 'TTO', qids: ['Q754'] },
  Q244: { name: 'Barbados', iso3: 'BRB', qids: ['Q244'] },
  Q784: { name: 'Dominica', iso3: 'DMA', qids: ['Q784'] },
  Q769: { name: 'Grenada', iso3: 'GRD', qids: ['Q769'] },
  Q760: { name: 'Saint Lucia', iso3: 'LCA', qids: ['Q760'] },
  Q757: { name: 'Saint Vincent and the Grenadines', iso3: 'VCT', qids: ['Q757'] },
  Q781: { name: 'Antigua and Barbuda', iso3: 'ATG', qids: ['Q781'] },
  Q763: { name: 'Saint Kitts and Nevis', iso3: 'KNA', qids: ['Q763'] },
  Q96: { name: 'Mexico', iso3: 'MEX', qids: ['Q96'] },
  Q242: { name: 'Belize', iso3: 'BLZ', qids: ['Q242'] },
  Q774: { name: 'Guatemala', iso3: 'GTM', qids: ['Q774'] },
  Q783: { name: 'Honduras', iso3: 'HND', qids: ['Q783'] },
  Q792: { name: 'El Salvador', iso3: 'SLV', qids: ['Q792'] },
  Q811: { name: 'Nicaragua', iso3: 'NIC', qids: ['Q811'] },
  Q800: { name: 'Costa Rica', iso3: 'CRI', qids: ['Q800'] },
  Q804: { name: 'Panama', iso3: 'PAN', qids: ['Q804'] },
  // Europe
  Q145: { name: 'United Kingdom', iso3: 'GBR', qids: ['Q145'] },
  Q27: { name: 'Ireland', iso3: 'IRL', qids: ['Q27', 'Q31747'] },
  Q55: { name: 'Netherlands', iso3: 'NLD', qids: ['Q55', 'Q29999'] },
  Q31: { name: 'Belgium', iso3: 'BEL', qids: ['Q31'] },
  Q32: { name: 'Luxembourg', iso3: 'LUX', qids: ['Q32'] },
  Q142: { name: 'France', iso3: 'FRA', qids: ['Q142'] },
  Q235: { name: 'Monaco', iso3: 'MCO', qids: ['Q235'] },
  Q347: { name: 'Liechtenstein', iso3: 'LIE', qids: ['Q347'] },
  Q39: { name: 'Switzerland', iso3: 'CHE', qids: ['Q39'] },
  Q29: { name: 'Spain', iso3: 'ESP', qids: ['Q29'] },
  Q228: { name: 'Andorra', iso3: 'AND', qids: ['Q228'] },
  Q45: { name: 'Portugal', iso3: 'PRT', qids: ['Q45'] },
  Q41304: { name: 'Germany', iso3: 'DEU', qids: ['Q41304', 'Q7318', 'Q183'] },
  Q713750: { name: 'West Germany / Germany', iso3: 'DEU', qids: ['Q713750', 'Q183'] },
  Q16957: { name: 'East Germany', iso3: null, qids: ['Q16957'] },
  Q36: { name: 'Poland', iso3: 'POL', qids: ['Q36'] },
  Q40: { name: 'Austria', iso3: 'AUT', qids: ['Q40'] },
  Q28: { name: 'Hungary', iso3: 'HUN', qids: ['Q28'] },
  Q33946: { name: 'Czechoslovakia', iso3: null, qids: ['Q33946'] },
  Q213: { name: 'Czechia', iso3: 'CZE', qids: ['Q213'] },
  Q214: { name: 'Slovakia', iso3: 'SVK', qids: ['Q214'] },
  Q38: { name: 'Italy', iso3: 'ITA', qids: ['Q38'] },
  Q238: { name: 'San Marino', iso3: 'SMR', qids: ['Q238'] },
  Q233: { name: 'Malta', iso3: 'MLT', qids: ['Q233'] },
  Q222: { name: 'Albania', iso3: 'ALB', qids: ['Q222'] },
  Q236: { name: 'Montenegro', iso3: 'MNE', qids: ['Q236'] },
  Q221: { name: 'North Macedonia', iso3: 'MKD', qids: ['Q221'] },
  Q224: { name: 'Croatia', iso3: 'HRV', qids: ['Q224'] },
  Q191077: { name: 'Yugoslavia / Serbia', iso3: 'SRB', qids: ['Q191077', 'Q83286', 'Q37024', 'Q403'] },
  Q225: { name: 'Bosnia and Herzegovina', iso3: 'BIH', qids: ['Q225'] },
  Q1246: { name: 'Kosovo', iso3: 'XKX', qids: ['Q1246'] },
  Q215: { name: 'Slovenia', iso3: 'SVN', qids: ['Q215'] },
  Q41: { name: 'Greece', iso3: 'GRC', qids: ['Q41'] },
  Q229: { name: 'Cyprus', iso3: 'CYP', qids: ['Q229'] },
  Q219: { name: 'Bulgaria', iso3: 'BGR', qids: ['Q219'] },
  Q217: { name: 'Moldova', iso3: 'MDA', qids: ['Q217'] },
  Q218: { name: 'Romania', iso3: 'ROU', qids: ['Q218'] },
  Q15180: { name: 'Soviet Union / Russia', iso3: 'RUS', qids: ['Q15180', 'Q159'] },
  Q191: { name: 'Estonia', iso3: 'EST', qids: ['Q191'] },
  Q211: { name: 'Latvia', iso3: 'LVA', qids: ['Q211'] },
  Q37: { name: 'Lithuania', iso3: 'LTU', qids: ['Q37'] },
  Q212: { name: 'Ukraine', iso3: 'UKR', qids: ['Q212'] },
  Q184: { name: 'Belarus', iso3: 'BLR', qids: ['Q184'] },
  Q399: { name: 'Armenia', iso3: 'ARM', qids: ['Q399'] },
  Q230: { name: 'Georgia', iso3: 'GEO', qids: ['Q230'] },
  Q227: { name: 'Azerbaijan', iso3: 'AZE', qids: ['Q227'] },
  Q33: { name: 'Finland', iso3: 'FIN', qids: ['Q33'] },
  Q34: { name: 'Sweden', iso3: 'SWE', qids: ['Q34'] },
  Q20: { name: 'Norway', iso3: 'NOR', qids: ['Q20'] },
  Q35: { name: 'Denmark', iso3: 'DNK', qids: ['Q35'] },
  Q189: { name: 'Iceland', iso3: 'ISL', qids: ['Q189'] },
  // Middle East & Asia
  Q43: { name: 'Turkey', iso3: 'TUR', qids: ['Q43'] },
  Q801: { name: 'Israel', iso3: 'ISR', qids: ['Q801'] },
  Q851: { name: 'Saudi Arabia', iso3: 'SAU', qids: ['Q851'] },
  Q13426199: { name: 'China', iso3: 'CHN', qids: ['Q13426199', 'Q148'] },
  Q17: { name: 'Japan', iso3: 'JPN', qids: ['Q17'] }
};

// Old addresses only. Until 20 November 2026 a country was written into this site's addresses (#c=<number>) and its
// data by its Gleditsch and Ward number, the code CShapes and Archigos use. OLD_KEYS maps those 79 numbers to the
// Wikidata keys above, so an address such as #y=1962&c=2 still opens the United States and is rewritten to #c=Q30;
// the data build also reads Archigos's own country column (ccode) through it, while VM keeps Archigos's leaders
// (scripts/build-data.mjs). It is used for nothing else. Whether it may stay is for VM's owner to decide.
export const OLD_KEYS = {
  2: 'Q30', 20: 'Q16', 31: 'Q778', 40: 'Q241', 41: 'Q790', 42: 'Q786', 51: 'Q766', 52: 'Q754', 53: 'Q244', 54: 'Q784',
  55: 'Q769', 56: 'Q760', 57: 'Q757', 58: 'Q781', 60: 'Q763', 70: 'Q96', 80: 'Q242', 90: 'Q774', 91: 'Q783', 92: 'Q792',
  93: 'Q811', 94: 'Q800', 95: 'Q804', 200: 'Q145', 205: 'Q27', 210: 'Q55', 211: 'Q31', 212: 'Q32', 220: 'Q142',
  221: 'Q235', 223: 'Q347', 225: 'Q39', 230: 'Q29', 232: 'Q228', 235: 'Q45', 255: 'Q41304', 260: 'Q713750',
  265: 'Q16957', 290: 'Q36', 305: 'Q40', 310: 'Q28', 315: 'Q33946', 316: 'Q213', 317: 'Q214', 325: 'Q38', 331: 'Q238',
  338: 'Q233', 339: 'Q222', 341: 'Q236', 343: 'Q221', 344: 'Q224', 345: 'Q191077', 346: 'Q225', 347: 'Q1246',
  349: 'Q215', 350: 'Q41', 352: 'Q229', 355: 'Q219', 359: 'Q217', 360: 'Q218', 365: 'Q15180', 366: 'Q191', 367: 'Q211',
  368: 'Q37', 369: 'Q212', 370: 'Q184', 371: 'Q399', 372: 'Q230', 373: 'Q227', 375: 'Q33', 380: 'Q34', 385: 'Q20',
  390: 'Q35', 395: 'Q189', 640: 'Q43', 666: 'Q801', 670: 'Q851', 710: 'Q13426199', 740: 'Q17'
};

// Wikipedia "<year> in <country>" article names, where they differ from the display name.
export const YEAR_IN = {
  Q30: 'the United States', Q145: 'the United Kingdom', Q55: 'the Netherlands', Q778: 'the Bahamas',
  Q786: 'the Dominican Republic', Q41304: 'Germany', Q713750: 'Germany', Q16957: 'East Germany',
  Q191077: 'Yugoslavia', Q15180: 'the Soviet Union', Q213: 'the Czech Republic', Q221: 'North Macedonia',
  Q757: 'Saint Vincent and the Grenadines'
};

export const FIRST_YEAR = 1926;
export const LAST_YEAR = 2026;
