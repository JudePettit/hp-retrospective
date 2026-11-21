// Which of Cliopatria's rows stand for each state the Political Retrospective covers: VM's own crosswalk, by the row's
// Name and years, written on 20 November 2026 from the rows of Cliopatria v0.2.1 that overlap 1926–2024.
// Cliopatria's own Wikidata ids are not used for this: for these years many are another item's (its Slovakia rows
// carry Czechoslovakia's Q33946, its Hungary rows Austria-Hungary's Q28513), and it holds several states under other
// names (the United Kingdom as "Kingdom of Great Britain", Spain as "Francoist Spain" from 1939 to 1975).
//
// Each entry is [Cliopatria's Name, first year, last year]; a year left out is open. A row counts for the state in the
// years its own span and the entry's share. Left out on purpose (VM's choices, by the same rule for every state):
// - rows whose Name is in brackets ("(British Empire)", "(Netherlands)"): Cliopatria's unions of other rows, which would
//   be drawn twice;
// - rows for one side in a civil war or rising ("Hungarian Nationalists" 1956–57, "Spanish Nationalists", "Communist
//   Party of China" before 1949, "Cuban Communists"), and states that were not the covered state ("Independent State of
//   Croatia", "Republic of China" from 1950, which is Taiwan);
// - "Kingdom of Italy" for 1944 (267 km²) and 1946 (340 km²) and "Estado Novo" from 1979 (6,894 km²): rows far smaller
//   than the state, which Cliopatria keeps beside its full rows;
// - Liechtenstein and San Marino: Cliopatria has no row for them in these years.
// A state with no row in a year it is covered is listed beside the map as one VM cannot place on a free border.
export const CLIO = {
  Q30: [['United States of America']],
  Q16: [['Canada']],
  Q778: [['Commonwealth of The Bahamas']],
  Q241: [['Republic of Cuba'], ['Communist Cuba']],
  Q790: [['Republic of Haiti']],
  Q786: [['Dominican Republic']],
  Q766: [['Jamaica']],
  Q754: [['Republic of Trinidad and Tobago']],
  Q244: [['Barbados']],
  Q784: [['Commonwealth of Dominica']],
  Q769: [['Grenada']],
  Q760: [['Saint Lucia']],
  Q757: [['Saint Vincent']],
  Q781: [['Antigua and Barbuda']],
  Q763: [['Saint Kitts']],
  Q96: [['Mexico']],
  Q242: [['Belize']],
  Q774: [['Guatemala']],
  Q783: [['Honduras']],
  Q792: [['Republic of El Salvador']],
  Q811: [['Republic of Nicaragua']],
  Q800: [['Republic of Costa Rica']],
  Q804: [['Republic of Panama']],
  Q145: [['Kingdom of Great Britain']],
  Q27: [['Irish Free State'], ['Éire']],
  Q55: [['Netherlands']],
  Q31: [['Kingdom of Belgium']],
  Q32: [['Luxembourg']],
  // Vichy France for 1940–43 (its row is the zone it governed), Free France's row for 1944 (the part it then held).
  Q142: [['French Third Republic'], ['Vichy France', 1940, 1943], ['Free French', 1944, 1944], ['French Fourth Republic'], ['French Fifth Republic']],
  Q235: [['Kingdom of Monaco'], ['Principality of Monaco']],
  Q347: [],
  Q39: [['Swiss Confederation']],
  Q29: [['Kingdom of Spain'], ['Second Spanish Republic'], ['Francoist Spain']],
  Q228: [['Principality of Andorra']],
  Q45: [['Estado Novo', null, 1975], ['Portugal']],
  Q41304: [['Weimar Republic'], ['Nazi Germany']],
  Q713750: [['Federal Republic of Germany'], ['Federated Republic of Germany']],
  Q16957: [['German Democratic Republic']],
  Q36: [['Second Polish Republic'], ['Republic of Poland']],
  Q40: [['Republic of Austria'], ['Second Republic of Austria']],
  Q28: [['Hungarian Republic'], ['Hungary'], ["Hungarian People's Republic"]],
  Q33946: [['Czechoslovakia']],
  Q213: [['Czech Republic']],
  Q214: [['Slovakia']],
  Q38: [['Kingdom of Italy', null, 1943], ['Kingdom of Italy', 1945, 1945], ['Republic of Italy']],
  Q238: [],
  Q233: [['Malta']],
  Q222: [['Albania'], ["People's Socialist Republic of Albania"], ['Republic of Albania']],
  Q236: [['Montenegro']],
  Q221: [['Former Yugoslav Republic of Macedonia']],
  Q224: [['Republic of Croatia']],
  Q191077: [['Yugoslavia'], ['Socialist Federal Republic of Yugoslavia'], ['Serbia-Montenegro'], ['Republic of Serbia']],
  Q225: [['Bosnia and Herzegovina']],
  Q1246: [['Kosovo']],
  Q215: [['Republic of Slovenia']],
  Q41: [['First Hellenic Republic'], ['Kingdom of Greece'], ['Greek junta'], ['Third Hellenic Republic']],
  Q229: [['Republic of Cyprus']],
  Q219: [['Principality of Bulgaria'], ['Kingdom of Bulgaria'], ["People's Republic of Bulgaria"], ['Republic of Bulgaria']],
  Q217: [['Republic of Moldova']],
  Q218: [['Kingdom of Romania'], ['Socialist Republic of Romania'], ['Romania']],
  Q15180: [['Union of Soviet Socialist Republics'], ['Russian Federation']],
  Q191: [['Estonia'], ['Republic of Estonia']],
  Q211: [['Republic of Latvia']],
  Q37: [['Kingdom of Lithuania'], ['Republic of Lithuania']],
  Q212: [['Ukraine']],
  Q184: [['Republic of Belarus']],
  Q399: [['Republic of Armenia']],
  Q230: [['Georgia']],
  Q227: [['Republic of Azerbaijan']],
  Q33: [['Republic of Finland']],
  Q34: [['Kingdom of Sweden']],
  Q20: [['Kingdom of Norway']],
  Q35: [['Denmark-Norway'], ['Denmark']],
  Q189: [['Kingdom of Iceland'], ['Republic of Iceland']],
  Q43: [['Republic of Turkey']],
  Q801: [['State of Israel']],
  Q851: [['Kingdom of Hejaz and Nejd'], ['Kingdom of Saudi Arabia']],
  // China: the Kuomintang's row to 1929, the Republic of China's to 1949; in 1949 the Communist Party's row too (the
  // two together are the mainland that year); the People's Republic's from 1950.
  Q13426199: [['Kuomintang'], ['Republic of China', null, 1949], ['Communist Party of China', 1949, 1949], ["People's Republic of China"]],
  Q17: [['Empire of Japan'], ['Japan']]
};

/** The state a row stands for in a year (VM's crosswalk above), or null. */
export function stateOf(name, year) {
  for (const [key, list] of Object.entries(CLIO)) {
    for (const [n, from, to] of list) if (n === name && (from == null || year >= from) && (to == null || year <= to)) return key;
  }
  return null;
}
