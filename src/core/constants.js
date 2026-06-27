// constants.js — all immutable data. No imports, no side-effects.
// Must be imported after storage.js in main.js.

// Dev mode flag
export const devMode = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost';

// Cache TTLs
export const CACHE_TTL = {
  sentiment: 1_800_000,  // 30min — tighter for active traders
  news:        600_000,  // 10min
  deep:      1_800_000,  // 30min
  social:      600_000,  // 10min
  authority: 3_600_000,  // 1h
};

// Cache timestamp maps
export const cacheTs       = {};
export const newsCacheTs   = {};
export const deepCacheTs   = {};
export const socialCacheTs = {};
export const authCacheTs   = {};

// Central bank & authority metadata
export const AUTHORITY_INFO = {
  "840": { authority:"Federal Reserve & U.S. Treasury",                lang:"English"           },
  "124": { authority:"Bank of Canada & OSFI",                          lang:"English"           },
  "484": { authority:"Banco de México (Banxico) & CNBV",               lang:"Español"           },
  "076": { authority:"Banco Central do Brasil & CVM",                  lang:"Português"         },
  "032": { authority:"Banco Central de la República Argentina & CNV",  lang:"Español"           },
  "152": { authority:"Banco Central de Chile & CMF",                   lang:"Español"           },
  "170": { authority:"Banco de la República Colombia & SFC",           lang:"Español"           },
  "604": { authority:"Banco Central de Reserva del Perú & SMV",       lang:"Español"           },
  "826": { authority:"Bank of England & FCA",                          lang:"English"           },
  "250": { authority:"Banque de France & AMF",                         lang:"Français"          },
  "276": { authority:"Deutsche Bundesbank & BaFin",                    lang:"Deutsch"           },
  "380": { authority:"Banca d'Italia & Consob",                        lang:"Italiano"          },
  "724": { authority:"Banco de España & CNMV",                         lang:"Español"           },
  "620": { authority:"Banco de Portugal & CMVM",                       lang:"Português"         },
  "528": { authority:"De Nederlandsche Bank & AFM",                    lang:"Nederlands"        },
  "756": { authority:"Swiss National Bank (SNB) & FINMA",              lang:"Deutsch"           },
  "040": { authority:"Oesterreichische Nationalbank & FMA",            lang:"Deutsch"           },
  "616": { authority:"Narodowy Bank Polski & KNF",                     lang:"Polski"            },
  "752": { authority:"Riksbank & Finansinspektionen",                  lang:"Svenska"           },
  "578": { authority:"Norges Bank & Finanstilsynet",                   lang:"Norsk"             },
  "246": { authority:"Bank of Finland (Suomen Pankki) & FIN-FSA",     lang:"Suomi"             },
  "208": { authority:"Danmarks Nationalbank & Finanstilsynet",         lang:"Dansk"             },
  "300": { authority:"Bank of Greece & HCMC",                         lang:"Ελληνικά"          },
  "056": { authority:"National Bank of Belgium & FSMA",               lang:"Français"          },
  "203": { authority:"Czech National Bank (ČNB)",                      lang:"Čeština"           },
  "642": { authority:"National Bank of Romania & ASF",                 lang:"Română"            },
  "643": { authority:"Bank of Russia (CBR) & Bank of Russia",         lang:"Русский"           },
  "792": { authority:"Central Bank of Turkey (CBRT) & CMB",           lang:"Türkçe"            },
  "364": { authority:"Central Bank of Iran & SEO",                    lang:"فارسی"             },
  "682": { authority:"Saudi Central Bank (SAMA) & CMA",               lang:"العربية"           },
  "784": { authority:"Central Bank of UAE & SCA",                     lang:"العربية"           },
  "376": { authority:"Bank of Israel & ISA",                          lang:"עברית"             },
  "818": { authority:"Central Bank of Egypt & FRA",                   lang:"العربية"           },
  "566": { authority:"Central Bank of Nigeria & SEC Nigeria",         lang:"English"           },
  "710": { authority:"South African Reserve Bank & FSCA",             lang:"English"           },
  "404": { authority:"Central Bank of Kenya & CMA Kenya",             lang:"English"           },
  "504": { authority:"Bank Al-Maghrib & AMMC",                        lang:"العربية"           },
  "356": { authority:"Reserve Bank of India (RBI) & SEBI",           lang:"हिंदी"             },
  "156": { authority:"People's Bank of China (PBOC) & CSRC",         lang:"中文"              },
  "392": { authority:"Bank of Japan (BOJ) & FSA Japan",              lang:"日本語"             },
  "410": { authority:"Bank of Korea (BOK) & FSC Korea",              lang:"한국어"             },
  "158": { authority:"Central Bank of the Republic of China & FSC",  lang:"中文"              },
  "764": { authority:"Bank of Thailand (BOT) & SEC Thailand",        lang:"ภาษาไทย"           },
  "704": { authority:"State Bank of Vietnam & SSC",                   lang:"Tiếng Việt"        },
  "458": { authority:"Bank Negara Malaysia & SC Malaysia",            lang:"Bahasa Melayu"     },
  "360": { authority:"Bank Indonesia & OJK",                          lang:"Bahasa Indonesia"  },
  "608": { authority:"Bangko Sentral ng Pilipinas & SEC Philippines", lang:"Filipino"          },
  "702": { authority:"Monetary Authority of Singapore (MAS)",         lang:"English"           },
  "036": { authority:"Reserve Bank of Australia (RBA) & ASIC",       lang:"English"           },
  "554": { authority:"Reserve Bank of New Zealand & FMA",             lang:"English"           },
  "398": { authority:"National Bank of Kazakhstan & AFSA",            lang:"Қазақша"           },
  "288": { authority:"Bank of Ghana & SEC Ghana",                     lang:"English"           },
  "144": { authority:"Central Bank of Sri Lanka & SEC Sri Lanka",     lang:"සිංහල"            },
  "414": { authority:"Central Bank of Kuwait & CMA Kuwait",           lang:"العربية"           },
  "634": { authority:"Qatar Central Bank & QFMA",                     lang:"العربية"           },
};

// Official CB/finance authority URLs
export const AUTHORITY_URLS = {
  "840":"https://www.federalreserve.gov",  "124":"https://www.bankofcanada.ca",
  "484":"https://www.banxico.org.mx",      "076":"https://www.bcb.gov.br",
  "032":"https://www.bcra.gob.ar",         "152":"https://www.bcentral.cl",
  "170":"https://www.banrep.gov.co",       "604":"https://www.bcrp.gob.pe",
  "826":"https://www.bankofengland.co.uk", "250":"https://www.banque-france.fr",
  "276":"https://www.bundesbank.de",       "380":"https://www.bancaditalia.it",
  "724":"https://www.bde.es",              "620":"https://www.bportugal.pt",
  "528":"https://www.dnb.nl",              "756":"https://www.snb.ch",
  "040":"https://www.oenb.at",             "616":"https://www.nbp.pl",
  "752":"https://www.riksbank.se",         "578":"https://www.norges-bank.no",
  "246":"https://www.suomenpankki.fi",     "208":"https://www.nationalbanken.dk",
  "300":"https://www.bankofgreece.gr",     "056":"https://www.nbb.be",
  "203":"https://www.cnb.cz",              "642":"https://www.bnr.ro",
  "643":"https://www.cbr.ru",              "792":"https://www.tcmb.gov.tr",
  "364":"https://www.cbi.ir",              "682":"https://www.sama.gov.sa",
  "784":"https://www.centralbank.ae",      "376":"https://www.boi.org.il",
  "818":"https://www.cbe.org.eg",          "566":"https://www.cbn.gov.ng",
  "710":"https://www.resbank.co.za",       "404":"https://www.centralbank.go.ke",
  "504":"https://www.bkam.ma",             "356":"https://www.rbi.org.in",
  "156":"https://www.pbc.gov.cn",          "392":"https://www.boj.or.jp",
  "410":"https://www.bok.or.kr",           "158":"https://www.cbc.gov.tw",
  "764":"https://www.bot.or.th",           "704":"https://www.sbv.gov.vn",
  "458":"https://www.bnm.gov.my",          "360":"https://www.bi.go.id",
  "608":"https://www.bsp.gov.ph",          "702":"https://www.mas.gov.sg",
  "036":"https://www.rba.gov.au",
  "554":"https://www.rbnz.govt.nz",        "398":"https://www.nationalbank.kz",
  "288":"https://www.bog.gov.gh",          "144":"https://www.cbsl.gov.lk",
  "414":"https://www.cbk.gov.kw",          "634":"https://www.qcb.gov.qa",
};

// Country metadata
export const META = {
  "840":  {name:"United States",   region:"North America", currency:"USD", index:"S&P 500",    flag:"🇺🇸"},
  "124":  {name:"Canada",          region:"North America", currency:"CAD", index:"TSX",         flag:"🇨🇦"},
  "484":  {name:"Mexico",          region:"North America", currency:"MXN", index:"IPC",         flag:"🇲🇽"},
  "076":  {name:"Brazil",          region:"South America", currency:"BRL", index:"Bovespa",     flag:"🇧🇷"},
  "032":  {name:"Argentina",       region:"South America", currency:"ARS", index:"Merval",      flag:"🇦🇷"},
  "152":  {name:"Chile",           region:"South America", currency:"CLP", index:"IPSA",        flag:"🇨🇱"},
  "170":  {name:"Colombia",        region:"South America", currency:"COP", index:"COLCAP",      flag:"🇨🇴"},
  "604":  {name:"Peru",            region:"South America", currency:"PEN", index:"S&P BVL",     flag:"🇵🇪"},
  "826":  {name:"United Kingdom",  region:"Europe",        currency:"GBP", index:"FTSE 100",    flag:"🇬🇧"},
  "250":  {name:"France",          region:"Europe",        currency:"EUR", index:"CAC 40",      flag:"🇫🇷"},
  "276":  {name:"Germany",         region:"Europe",        currency:"EUR", index:"DAX",         flag:"🇩🇪"},
  "380":  {name:"Italy",           region:"Europe",        currency:"EUR", index:"FTSE MIB",    flag:"🇮🇹"},
  "724":  {name:"Spain",           region:"Europe",        currency:"EUR", index:"IBEX 35",     flag:"🇪🇸"},
  "620":  {name:"Portugal",        region:"Europe",        currency:"EUR", index:"PSI 20",      flag:"🇵🇹"},
  "528":  {name:"Netherlands",     region:"Europe",        currency:"EUR", index:"AEX",         flag:"🇳🇱"},
  "756":  {name:"Switzerland",     region:"Europe",        currency:"CHF", index:"SMI",         flag:"🇨🇭"},
  "040":  {name:"Austria",         region:"Europe",        currency:"EUR", index:"ATX",         flag:"🇦🇹"},
  "616":  {name:"Poland",          region:"Europe",        currency:"PLN", index:"WIG 20",      flag:"🇵🇱"},
  "752":  {name:"Sweden",          region:"Europe",        currency:"SEK", index:"OMX 30",      flag:"🇸🇪"},
  "578":  {name:"Norway",          region:"Europe",        currency:"NOK", index:"OBX",         flag:"🇳🇴"},
  "246":  {name:"Finland",         region:"Europe",        currency:"EUR", index:"OMX Helsinki",flag:"🇫🇮"},
  "208":  {name:"Denmark",         region:"Europe",        currency:"DKK", index:"OMX Copenhagen",flag:"🇩🇰"},
  "300":  {name:"Greece",          region:"Europe",        currency:"EUR", index:"Athens GI",   flag:"🇬🇷"},
  "804":  {name:"Ukraine",         region:"Europe",        currency:"UAH", index:"PFTS",        flag:"🇺🇦"},
  "056":  {name:"Belgium",         region:"Europe",        currency:"EUR", index:"BEL 20",      flag:"🇧🇪"},
  "203":  {name:"Czech Republic",  region:"Europe",        currency:"CZK", index:"PX",          flag:"🇨🇿"},
  "642":  {name:"Romania",         region:"Europe",        currency:"RON", index:"BET",         flag:"🇷🇴"},
  "643":  {name:"Russia",          region:"Eurasia",       currency:"RUB", index:"MOEX",        flag:"🇷🇺"},
  "792":  {name:"Turkey",          region:"Middle East",   currency:"TRY", index:"BIST 100",    flag:"🇹🇷"},
  "364":  {name:"Iran",            region:"Middle East",   currency:"IRR", index:"Tehran SE",   flag:"🇮🇷"},
  "682":  {name:"Saudi Arabia",    region:"Middle East",   currency:"SAR", index:"Tadawul",     flag:"🇸🇦"},
  "784":  {name:"UAE",             region:"Middle East",   currency:"AED", index:"DFM",         flag:"🇦🇪"},
  "376":  {name:"Israel",          region:"Middle East",   currency:"ILS", index:"TA-35",       flag:"🇮🇱"},
  "818":  {name:"Egypt",           region:"Africa",        currency:"EGP", index:"EGX 30",      flag:"🇪🇬"},
  "566":  {name:"Nigeria",         region:"Africa",        currency:"NGN", index:"NGX",         flag:"🇳🇬"},
  "710":  {name:"South Africa",    region:"Africa",        currency:"ZAR", index:"JSE Top 40",  flag:"🇿🇦"},
  "404":  {name:"Kenya",           region:"Africa",        currency:"KES", index:"NSE 20",      flag:"🇰🇪"},
  "504":  {name:"Morocco",         region:"Africa",        currency:"MAD", index:"MASI",        flag:"🇲🇦"},
  "398":  {name:"Kazakhstan",      region:"Central Asia",  currency:"KZT", index:"KASE",        flag:"🇰🇿"},
  "356":  {name:"India",           region:"South Asia",    currency:"INR", index:"Nifty 50",    flag:"🇮🇳"},
  "050":  {name:"Bangladesh",      region:"South Asia",    currency:"BDT", index:"DSEX",        flag:"🇧🇩"},
  "586":  {name:"Pakistan",        region:"South Asia",    currency:"PKR", index:"KSE 100",     flag:"🇵🇰"},
  "156":  {name:"China",           region:"East Asia",     currency:"CNY", index:"CSI 300",     flag:"🇨🇳"},
  "392":  {name:"Japan",           region:"East Asia",     currency:"JPY", index:"Nikkei 225",  flag:"🇯🇵"},
  "410":  {name:"South Korea",     region:"East Asia",     currency:"KRW", index:"KOSPI",       flag:"🇰🇷"},
  "158":  {name:"Taiwan",          region:"East Asia",     currency:"TWD", index:"TAIEX",       flag:"🇹🇼"},
  "496":  {name:"Mongolia",        region:"East Asia",     currency:"MNT", index:"MSE",         flag:"🇲🇳"},
  "764":  {name:"Thailand",        region:"SE Asia",       currency:"THB", index:"SET",         flag:"🇹🇭"},
  "704":  {name:"Vietnam",         region:"SE Asia",       currency:"VND", index:"VN-Index",    flag:"🇻🇳"},
  "458":  {name:"Malaysia",        region:"SE Asia",       currency:"MYR", index:"KLCI",        flag:"🇲🇾"},
  "360":  {name:"Indonesia",       region:"SE Asia",       currency:"IDR", index:"IDX Composite",flag:"🇮🇩"},
  "608":  {name:"Philippines",     region:"SE Asia",       currency:"PHP", index:"PSEi",        flag:"🇵🇭"},
  "702":  {name:"Singapore",       region:"SE Asia",       currency:"SGD", index:"STI",         flag:"🇸🇬"},
  "036":  {name:"Australia",       region:"Oceania",       currency:"AUD", index:"ASX 200",     flag:"🇦🇺"},
  "554":  {name:"New Zealand",     region:"Oceania",       currency:"NZD", index:"NZX 50",      flag:"🇳🇿"},
  "012":  {name:"Algeria",         region:"Africa",        currency:"DZD", index:"—",           flag:"🇩🇿"},
  "024":  {name:"Angola",          region:"Africa",        currency:"AOA", index:"—",           flag:"🇦🇴"},
  "288":  {name:"Ghana",           region:"Africa",        currency:"GHS", index:"GSE CI",      flag:"🇬🇭"},
  "231":  {name:"Ethiopia",        region:"Africa",        currency:"ETB", index:"—",           flag:"🇪🇹"},
  "144":  {name:"Sri Lanka",       region:"South Asia",    currency:"LKR", index:"CSE",         flag:"🇱🇰"},
  "104":  {name:"Myanmar",         region:"SE Asia",       currency:"MMK", index:"YSX",         flag:"🇲🇲"},
  "116":  {name:"Cambodia",        region:"SE Asia",       currency:"KHR", index:"CSX",         flag:"🇰🇭"},
  "268":  {name:"Georgia",         region:"Central Asia",  currency:"GEL", index:"GSE",         flag:"🇬🇪"},
  "218":  {name:"Ecuador",         region:"South America", currency:"USD", index:"BVQ",         flag:"🇪🇨"},
  "858":  {name:"Uruguay",         region:"South America", currency:"UYU", index:"—",           flag:"🇺🇾"},
  "068":  {name:"Bolivia",         region:"South America", currency:"BOB", index:"BBV",         flag:"🇧🇴"},
  "600":  {name:"Paraguay",        region:"South America", currency:"PYG", index:"—",           flag:"🇵🇾"},
  "384":  {name:"Ivory Coast",     region:"Africa",        currency:"XOF", index:"—",           flag:"🇨🇮"},
  "800":  {name:"Uganda",          region:"Africa",        currency:"UGX", index:"USE",         flag:"🇺🇬"},
  "834":  {name:"Tanzania",        region:"Africa",        currency:"TZS", index:"DSE",         flag:"🇹🇿"},
  "516":  {name:"Namibia",         region:"Africa",        currency:"NAD", index:"NSX",         flag:"🇳🇦"},
  "508":  {name:"Mozambique",      region:"Africa",        currency:"MZN", index:"—",           flag:"🇲🇿"},
  "716":  {name:"Zimbabwe",        region:"Africa",        currency:"ZWL", index:"ZSE",         flag:"🇿🇼"},
  "180":  {name:"DR Congo",        region:"Africa",        currency:"CDF", index:"—",           flag:"🇨🇩"},
  "760":  {name:"Syria",           region:"Middle East",   currency:"SYP", index:"—",           flag:"🇸🇾"},
  "368":  {name:"Iraq",            region:"Middle East",   currency:"IQD", index:"ISX",         flag:"🇮🇶"},
  "400":  {name:"Jordan",          region:"Middle East",   currency:"JOD", index:"ASE",         flag:"🇯🇴"},
  "414":  {name:"Kuwait",          region:"Middle East",   currency:"KWD", index:"BK",          flag:"🇰🇼"},
  "634":  {name:"Qatar",           region:"Middle East",   currency:"QAR", index:"QE",          flag:"🇶🇦"},
  "064":  {name:"Bhutan",          region:"South Asia",    currency:"BTN", index:"—",           flag:"🇧🇹"},
  "524":  {name:"Nepal",           region:"South Asia",    currency:"NPR", index:"NEPSE",       flag:"🇳🇵"},
};

// Data vintage marker
export const DATA_VINTAGE = 'Q2 2025';

// Macro context snapshots
export const MACRO_CONTEXT = {
  "840": { gdp:"+2.2", cpi:"3.8",  rate:"4.25", unemp:"4.3", ca:"-3.5", pmi:"50.1", note:"Fed on hold at 4.25%; tariff-driven CPI surge to ~3.8%; growth slowing; stagflation risk rising; services resilient but manufacturing stalling" },
  "156": { gdp:"+4.6", cpi:"-0.4", rate:"3.05", unemp:"5.3", ca:"+1.0", pmi:"49.3", note:"US tariffs major headwind; PBOC easing accelerated; deflation deepening despite fiscal stimulus; export rerouting via ASEAN ongoing" },
  "276": { gdp:"-0.3", cpi:"2.1",  rate:"2.15", unemp:"6.1", ca:"+5.4", pmi:"43.8", note:"ECB cut to 2.15%; Germany in continued contraction; auto sector pain from EV transition and US tariffs; new coalition government fiscal plans cautious" },
  "392": { gdp:"+1.3", cpi:"3.5",  rate:"0.75", unemp:"2.4", ca:"+3.2", pmi:"49.3", note:"BOJ hiked to 0.75% in Q2 2025; yen recovered vs USD; wage-price spiral risk building; JGB yield curve steepening" },
  "826": { gdp:"+1.3", cpi:"2.3",  rate:"4.25", unemp:"4.5", ca:"-3.4", pmi:"51.4", note:"BOE cut to 4.25% in Q2 2025; services inflation easing; labour market loosening; fiscal consolidation weighing on demand" },
  "250": { gdp:"+1.0", cpi:"0.9",  rate:"2.15", unemp:"7.4", ca:"-1.3", pmi:"45.0", note:"ECB cut to 2.15%; fiscal credibility strained; political fragmentation persists; manufacturing PMI in deep contraction" },
  "380": { gdp:"+0.7", cpi:"1.2",  rate:"2.15", unemp:"5.7", ca:"+1.8", pmi:"47.2", note:"ECB cut to 2.15%; domestic demand weak; BTP-Bund spread contained; labour market resilient; high debt constraining fiscal space" },
  "124": { gdp:"+1.4", cpi:"2.1",  rate:"2.25", unemp:"7.0", ca:"-1.4", pmi:"49.3", note:"BOC cut to 2.25%; US tariffs weigh on exports; housing soft; immigration slowdown denting consumption; recession risk elevated" },
  "036": { gdp:"+1.0", cpi:"2.3",  rate:"3.85", unemp:"4.1", ca:"-1.1", pmi:"50.3", note:"RBA cut to 3.85% in Q2 2025; China demand uncertainty persists; iron ore and LNG exports stable; housing market resilient" },
  "076": { gdp:"+3.0", cpi:"6.1",  rate:"14.75",unemp:"6.6", ca:"-2.3", pmi:"51.5", note:"BCB hiked further to 14.75% to fight sticky inflation; fiscal primary deficit concern; BRL pressured; commodity sector supportive" },
  "356": { gdp:"+6.5", cpi:"3.8",  rate:"6.00", unemp:"7.9", ca:"-1.3", pmi:"57.8", note:"RBI cut to 6.00%; strong growth momentum continues; manufacturing FDI inflow accelerating; capex supercycle intact; CPI slightly elevated" },
  "410": { gdp:"+2.0", cpi:"1.8",  rate:"2.50", unemp:"2.9", ca:"+4.1", pmi:"48.0", note:"BOK cut to 2.50%; political uncertainty fading; AI memory chip exports boom; domestic demand still cautious; KRW stabilising" },
  "484": { gdp:"+1.1", cpi:"3.6",  rate:"8.00", unemp:"3.2", ca:"-1.1", pmi:"46.8", note:"Banxico cut to 8.00%; nearshoring investment ongoing despite USMCA tensions; US tariff uncertainty; peso under pressure vs USD" },
  "682": { gdp:"+3.0", cpi:"1.9",  rate:"5.50", unemp:"3.4", ca:"+4.8", pmi:"58.2", note:"OPEC+ production discipline maintained; Vision 2030 capex at record; oil price downside risk from demand slowdown; SAR peg stable" },
  "158": { gdp:"+3.4", cpi:"2.2",  rate:"2.00", unemp:"3.4", ca:"+13.2",pmi:"51.5", note:"CBC on hold; TSMC AI CoWoS demand driving export premium; US-China tensions keeping geopolitical risk premium elevated" },
  "702": { gdp:"+3.5", cpi:"1.5",  rate:"3.25", unemp:"1.9", ca:"+18.0",pmi:"51.3", note:"MAS kept NEER stance slightly accommodative; wealth management inflows robust; US-China tariff spillover risk on re-exports" },
  "752": { gdp:"+1.1", cpi:"2.0",  rate:"2.00", unemp:"8.5", ca:"+5.3", pmi:"52.0", note:"Riksbank cut to 2.00%; housing market recovering; krona stable; export competitiveness supported by rate differential compression" },
  "756": { gdp:"+1.5", cpi:"0.3",  rate:"0.00", unemp:"2.8", ca:"+9.4", pmi:"49.0", note:"SNB cut to 0.00%; CHF safe-haven demand persistent; near-deflation; SNB watching EUR/CHF closely for intervention trigger" },
  "528": { gdp:"+1.0", cpi:"2.5",  rate:"2.15", unemp:"3.7", ca:"+8.0", pmi:"51.5", note:"ECB cut to 2.15%; ASML AI semiconductor demand strong; energy transition capex rising; trade surplus with US under scrutiny" },
  "710": { gdp:"+1.5", cpi:"3.2",  rate:"7.25", unemp:"32.1",ca:"-1.3", pmi:"49.6", note:"SARB cut to 7.25%; Eskom load-shedding eased; structural unemployment entrenched; ZAR volatile on EM risk appetite" },
  "643": { gdp:"+3.8", cpi:"9.8",  rate:"21.00",unemp:"2.4", ca:"+4.2", pmi:"51.0", note:"War economy; CBR holding at 21%; inflation elevated; sanctions weigh on imports; energy exports rerouted to Asia; ruble managed" },
  "792": { gdp:"+3.1", cpi:"35.0", rate:"30.00",unemp:"8.4", ca:"-3.3", pmi:"50.1", note:"TCMB cut aggressively to 30% in 2025; disinflation ongoing; lira stabilising; real rates turning less negative; FX reserves rebuilding" },
  "360": { gdp:"+5.0", cpi:"2.4",  rate:"5.50", unemp:"4.9", ca:"-1.0", pmi:"53.4", note:"BI cut to 5.50%; resilient domestic demand; commodity exports healthy; rupiah stable; global tariff uncertainty manageable" },
  "724": { gdp:"+3.0", cpi:"2.2",  rate:"2.15", unemp:"11.5",ca:"+2.7", pmi:"55.8", note:"ECB cut to 2.15%; Spain outperforming eurozone peers; tourism and services driving growth; labour market among best in EU" },
  "616": { gdp:"+3.3", cpi:"4.5",  rate:"5.25", unemp:"5.2", ca:"-2.6", pmi:"50.3", note:"NBP started cutting to 5.25%; EU funds boosting capex; near-shoring beneficiary; CPI still elevated constraining pace of cuts" },
  "032": { gdp:"-1.0", cpi:"30.0", rate:"22.00",unemp:"6.8", ca:"+1.7", pmi:"46.0", note:"Milei shock therapy delivering disinflation from triple digits to 30%; CBR cutting; IMF deal secured; recession bottoming; peso stabilising" },
  "554": { gdp:"+0.8", cpi:"2.1",  rate:"3.25", unemp:"5.2", ca:"-5.6", pmi:"48.2", note:"RBNZ cut to 3.25%; housing correction stabilising; dairy export terms of trade soft; recovery expected H2 2025" },
  "376": { gdp:"+0.4", cpi:"3.4",  rate:"4.25", unemp:"4.4", ca:"+5.0", pmi:"49.0", note:"BOI cut to 4.25%; conflict ongoing but tech sector resilient; tourism hit; geopolitical risk premium remains elevated" },
  "784": { gdp:"+4.1", cpi:"2.5",  rate:"4.40", unemp:"2.8", ca:"+8.2", pmi:"55.5", note:"Non-oil GDP diversifying rapidly; property sector boom; sovereign wealth fund expanding; rate tied to Fed policy trajectory" },
  "578": { gdp:"+2.3", cpi:"2.7",  rate:"4.25", unemp:"2.1", ca:"+15.0",pmi:"50.0", note:"Norges Bank cut to 4.25%; oil sector buffer intact; sovereign wealth fund at record; krone under mild pressure from oil price weakness" },
  "152": { gdp:"+2.4", cpi:"4.3",  rate:"4.75", unemp:"8.8", ca:"-2.6", pmi:"51.0", note:"BCCh cut to 4.75%; copper price volatile on US-China tariff uncertainty; lithium sector expanding; domestic demand recovering" },
  "458": { gdp:"+5.3", cpi:"2.1",  rate:"3.00", unemp:"3.4", ca:"+3.3", pmi:"49.5", note:"BNM on hold; EV and semiconductor supply chain diversification continuing; ringgit stable; US tariff spillover modest" },
  "704": { gdp:"+6.4", cpi:"3.6",  rate:"4.50", unemp:"2.2", ca:"+2.4", pmi:"54.0", note:"SBV on hold; FDI manufacturing boom; Apple and Samsung supply chain shifts driving exports; dong stable; strong growth outlook" },
  "764": { gdp:"+2.4", cpi:"0.9",  rate:"2.25", unemp:"1.0", ca:"+2.4", pmi:"50.0", note:"BOT cut to 2.25%; tourism recovery incomplete; household debt high; Chinese tourist shortfall persists; baht under mild pressure" },
  "818": { gdp:"+4.4", cpi:"13.0", rate:"27.25",unemp:"6.8", ca:"-2.1", pmi:"49.7", note:"CBE on hold; EGP stable post-devaluation; IMF programme on track; inflation elevated; tourism revenue recovering" },
  "566": { gdp:"+3.4", cpi:"25.0", rate:"27.50",unemp:"5.1", ca:"+0.4", pmi:"50.0", note:"CBN hiked to 27.50%; naira reform ongoing; oil output recovering; inflation remains very high; external accounts improving" },
  "300": { gdp:"+2.4", cpi:"2.9",  rate:"2.15", unemp:"9.7", ca:"-7.6", pmi:"53.7", note:"ECB cut to 2.15%; Greece primary surplus maintained; tourism-driven growth robust; bond spreads compressed; reform momentum sustaining" },
  "208": { gdp:"+1.9", cpi:"2.2",  rate:"2.15", unemp:"5.0", ca:"+8.4", pmi:"52.5", note:"Nationalbank tracks ECB at 2.15%; green energy export leader; DKK peg stable; fiscal position strong; exports resilient" },
  "246": { gdp:"+1.4", cpi:"2.4",  rate:"2.15", unemp:"7.0", ca:"+0.6", pmi:"50.0", note:"ECB cut to 2.15%; Finland export recovery slow; Nokia restructuring complete; Nordic fiscal discipline intact" },
  "608": { gdp:"+5.8", cpi:"2.7",  rate:"5.25", unemp:"3.5", ca:"-2.6", pmi:"51.7", note:"BSP cut to 5.25%; strong remittance inflows; BPO sector growing; domestic consumption solid; typhoon and climate risk a structural concern" },
};

// World Bank ISO-2 codes
export const COUNTRY_ISO2 = {
  '840':'US','156':'CN','276':'DE','392':'JP','826':'GB','250':'FR','380':'IT',
  '124':'CA','036':'AU','076':'BR','356':'IN','410':'KR','484':'MX','682':'SA',
  '158':'TW','702':'SG','752':'SE','756':'CH','528':'NL','710':'ZA','643':'RU',
  '792':'TR','360':'ID','724':'ES','616':'PL','032':'AR','554':'NZ','376':'IL',
  '784':'AE','578':'NO','152':'CL','458':'MY','704':'VN','764':'TH','818':'EG',
  '566':'NG','300':'GR','208':'DK','246':'FI','608':'PH',
};

// History chart series config
export const HISTORY_SERIES = {
  gdp:       { label:'GDP Growth',   color:'#10B981', unit:'%' },
  inflation: { label:'CPI Inflation',color:'#F59E0B', unit:'%' },
  rate:      { label:'Policy Rate',  color:'#22D3EE', unit:'%' },
  fx:        { label:'FX vs USD',    color:'#60A5FA', unit:''  },
};

// Opportunity horizons
export const OPP_HORIZONS = ['DAY','WEEK','MONTH','THEMES'];

// Region display names
export const REGION_NAMES = {
  americas: 'Americas',
  europe:   'Europe',
  asia:     ['East Asia','SE Asia','South Asia','Central Asia','Middle East'],
  africa:   'Africa',
  oceania:  'Oceania',
};

// Region top countries for prefetch
export const REGION_TOP = {
  americas: ['840','076','484','032','124','170','152'],
  europe:   ['826','276','250','380','724','528','756','616','752'],
  asia:     ['156','392','356','410','158','360','682','704','764','458'],
  africa:   ['710','566','818','404','504'],
  oceania:  ['036','554'],
};

// Mini-ticker bar items
export const TICKERS = [
  { id: 'mtb-dxy',  key: 'dxy',   decimals: 2, label: 'DXY'   },
  { id: 'mtb-gold', key: 'gold',  decimals: 1, label: 'GOLD'  },
  { id: 'mtb-wti',  key: 'wti',   decimals: 2, label: 'WTI'   },
  { id: 'mtb-vix',  key: 'vix',   decimals: 2, label: 'VIX'   },
  { id: 'mtb-10y',  key: 'us10y', decimals: 3, label: 'US10Y' },
];

// Deep analysis tab prompts
export const DEEP_TAB_PROMPTS = {
  overview: m => `Provide a comprehensive macroeconomic overview of ${m.name} (${m.region}). Cover: economic structure, GDP size and growth drivers, major sectors, trade relationships, demographic profile, and geopolitical positioning. Also include recent economic trajectory and how it fits into the global macro landscape.`,
  economy:  m => `Analyse the current macroeconomy of ${m.name} in depth. Use the VERIFIED MACRO SNAPSHOT injected above as your quantitative baseline — cite those specific GDP/CPI/rate figures and explain any deviations from your knowledge of post-vintage developments. Cover: GDP growth rate and forecast, inflation dynamics and central bank (${(AUTHORITY_INFO[m._id||'']?.authority||'').split('&')[0].trim()}) policy stance, fiscal position (deficit/surplus, debt-to-GDP), trade balance and key exports/imports, unemployment, wage growth, structural challenges, and forward-looking economic assessment.`,
  markets:  m => `Provide detailed capital markets analysis for ${m.name}. Cover: ${m.index} equity market performance and valuation (P/E, forward multiples), sector rotation trends, ${m.currency} FX dynamics and key drivers, bond market/yield curve shape, foreign portfolio investment flows, top listed companies and their weight, and overall market liquidity and accessibility.`,
  risks:    m => `Identify and deeply analyse the top macro risks for ${m.name}. Assess: political and geopolitical risks, financial stability (banking system, credit cycle, currency risk), external vulnerabilities (trade shocks, commodity exposure), structural risks (demographics, debt levels), climate/energy transition risks, and contagion risk from global stress. For each risk assess probability and market impact.`,
  outlook:  m => `Provide a 12-month forward-looking macro outlook for ${m.name}. Your forecast must be consistent with the CURRENT AI ASSESSMENT (score/regime/rate_outlook) injected above — if you disagree with that assessment, explicitly explain why with specific evidence. Include: GDP growth forecast with key upside/downside scenarios, inflation trajectory and expected rate path from ${(AUTHORITY_INFO[m._id||'']?.authority||'').split('&')[0].trim()}, ${m.currency} currency outlook vs USD and EUR, ${m.index} equity market outlook with target range, key upcoming catalysts (elections, central bank meetings, data releases), and overall investment recommendation.`,
};

// Custom analysis tag suggestions
export const CA_SUGGESTIONS = [
  'Fed rate policy','China slowdown','AI & semiconductors','Oil & energy',
  'Emerging markets','Dollar strength','Inflation dynamics','EM debt crisis',
  'Tech sector','Gold & commodities','Real estate','Banking stress',
  'Climate transition','Supply chain','Japan carry trade','Crypto sentiment',
];

// Quick search actions
export const QS_ACTIONS = [
  { icon:'🗺️', name:'FX Markets',    sub:'G10 & EM currency heatmap',  tag:'SECTION', action:() => openFx()        },
  { icon:'⛏️', name:'Commodities',   sub:'Energy, metals, agriculture', tag:'SECTION', action:() => openCommodities() },
  { icon:'📚', name:'Research Hub',  sub:'Goldman Sachs, JPMorgan, IMF…',tag:'SECTION', action:() => openResearch()  },
  { icon:'💬', name:'Community',     sub:'Macro community board',        tag:'SECTION', action:() => openCommunity() },
  { icon:'📅', name:'Economic Calendar',sub:'Upcoming macro events',     tag:'SECTION', action:() => openCalendar()  },
  { icon:'⊕', name:'Custom Analysis',sub:'Build multi-theme analysis',   tag:'SECTION', action:() => openCustomAnalysis() },
  { icon:'👤', name:'Profile & Digest',sub:'Settings, digest, opportunities',tag:'SECTION', action:() => openProfile() },
];

// Auth storage keys
export const AUTH_USERS_KEY   = 'gmi_users';
export const AUTH_SESSION_KEY = 'gmi_session';

// Calendar
export const CAL_TTL = 12 * 60 * 60 * 1000;

// CB meeting schedule
export const CB_SCHEDULE = [
  // FOMC
  {date:'2025-01-29',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-03-19',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-05-07',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-06-18',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-07-30',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-09-17',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-10-29',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2025-12-10',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-01-28',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-03-18',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-04-29',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-06-17',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-07-29',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-09-16',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-10-28',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  {date:'2026-12-09',name:'FOMC Rate Decision',country:'US',category:'cb',importance:'high'},
  // ECB
  {date:'2025-01-30',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-03-06',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-04-17',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-06-05',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-07-24',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-09-11',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-10-30',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2025-12-18',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-01-22',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-03-05',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-04-23',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-06-04',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-07-23',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-09-10',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-10-29',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  {date:'2026-12-17',name:'ECB Rate Decision',country:'EU',category:'cb',importance:'high'},
  // BOE
  {date:'2025-02-06',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-03-20',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-05-08',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-06-19',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-08-07',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-09-18',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-11-06',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2025-12-18',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-02-05',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-03-19',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-05-07',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-06-18',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-08-06',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-09-17',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-11-05',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  {date:'2026-12-17',name:'BOE Rate Decision',country:'UK',category:'cb',importance:'high'},
  // BOJ
  {date:'2025-01-24',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-03-19',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-05-01',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-06-17',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-07-31',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-09-19',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-10-29',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2025-12-19',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-01-23',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-03-18',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-04-30',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-06-16',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-07-30',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-09-18',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-10-28',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  {date:'2026-12-18',name:'BOJ Rate Decision',country:'JP',category:'cb',importance:'high'},
  // RBA
  {date:'2025-02-18',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-04-01',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-05-20',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-07-08',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-08-05',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-09-30',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-11-04',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2025-12-09',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-02-17',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-03-31',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-05-19',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-07-07',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-08-04',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-09-29',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-11-03',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
  {date:'2026-12-08',name:'RBA Rate Decision',country:'AU',category:'cb',importance:'high'},
];

// Yahoo Finance ticker symbols
export const YF_TICKER = {
  // Energy
  WTI:'CL=F', BRENT:'BZ=F', NATGAS:'NG=F', RBOB:'RB=F', HOIL:'HO=F',
  // Metals
  GOLD:'GC=F', SILVER:'SI=F', PLAT:'PL=F', PALL:'PA=F', COPPER:'HG=F', ALUM:'ALI=F', NICKEL:'NIF=F',
  ZINC:'ZNC=F', LEAD:'PB=F',
  // Agriculture & Softs
  CORN:'ZC=F', WHEAT:'ZW=F', SOYB:'ZS=F', COFFEE:'KC=F', SUGAR:'SB=F',
  COTTON:'CT=F', COCOA:'CC=F', CATTLE:'LE=F', HOGS:'HE=F', OJ:'OJ=F', LUMBER:'LBS=F',
  // G10 FX vs USD (USD as base where needed)
  EUR:'EURUSD=X', GBP:'GBPUSD=X', JPY:'USDJPY=X', CHF:'USDCHF=X',
  AUD:'AUDUSD=X', NZD:'NZDUSD=X', CAD:'USDCAD=X', SEK:'USDSEK=X', NOK:'USDNOK=X',
  // EM Asia
  CNY:'USDCNY=X', INR:'USDINR=X', KRW:'USDKRW=X', SGD:'USDSGD=X',
  HKD:'USDHKD=X', IDR:'USDIDR=X', MYR:'USDMYR=X', THB:'USDTHB=X', PHP:'USDPHP=X',
  TWD:'USDTWD=X',
  // EM EMEA
  ZAR:'USDZAR=X', TRY:'USDTRY=X', RUB:'USDRUB=X', PLN:'USDPLN=X',
  HUF:'USDHUF=X', ILS:'USDILS=X', EGP:'USDEGP=X', NGN:'USDNGN=X',
  SAR:'USDSAR=X', AED:'USDAED=X', QAR:'USDQAR=X',
  CZK:'USDCZK=X',
  // EM LatAm
  BRL:'USDBRL=X', MXN:'USDMXN=X', ARS:'USDARS=X', CLP:'USDCLP=X', COP:'USDCOP=X', PEN:'USDPEN=X',
  // Market indicators (for mini-tickers)
  DXY:'DX-Y.NYB', VIX:'^VIX', US10Y:'^TNX',
};

// Research sources
export const RESEARCH_SOURCES = [
  // Investment Banks
  { id:'gs',   name:'Goldman Sachs',     cat:'banks',    color:'#3b82f6',
    url:'https://www.goldmansachs.com/insights/',
    searchUrl:'https://www.goldmansachs.com/intelligence/search-results/?q={q}' },
  { id:'jpm',  name:'JPMorgan',          cat:'banks',    color:'#1d4ed8',
    url:'https://www.jpmorgan.com/insights/global-research',
    searchUrl:'https://www.jpmorgan.com/insights/global-research?q={q}' },
  { id:'ms',   name:'Morgan Stanley',    cat:'banks',    color:'#2563eb',
    url:'https://www.morganstanley.com/ideas',
    searchUrl:'https://www.morganstanley.com/search#q={q}&t=All' },
  { id:'bofa', name:'BofA Securities',   cat:'banks',    color:'#dc2626',
    url:'https://institute.bankofamerica.com/insights.html',
    searchUrl:'https://institute.bankofamerica.com/insights.html?q={q}' },
  { id:'citi', name:'Citi Research',     cat:'banks',    color:'#1e40af',
    url:'https://www.privatebank.citibank.com/insights-and-ideas',
    searchUrl:'https://www.privatebank.citibank.com/insights-and-ideas?q={q}' },
  { id:'ubs',  name:'UBS',               cat:'banks',    color:'#ef4444',
    url:'https://www.ubs.com/global/en/wealth-management/insights.html',
    searchUrl:'https://www.ubs.com/global/en/wealth-management/insights.html?q={q}' },
  { id:'db',   name:'Deutsche Bank',     cat:'banks',    color:'#60a5fa',
    url:'https://www.db.com/what-we-do/research',
    searchUrl:'https://www.db.com/what-we-do/research?q={q}' },
  { id:'barc', name:'Barclays Research', cat:'banks',    color:'#818cf8',
    url:'https://www.investmentbank.barclays.com/our-insights.html',
    searchUrl:'https://www.investmentbank.barclays.com/our-insights.html?q={q}' },
  // Hedge Funds & Asset Managers
  { id:'bl',   name:'BlackRock BII',     cat:'hedge',    color:'#7c3aed',
    url:'https://www.blackrock.com/us/individual/insights',
    searchUrl:'https://www.blackrock.com/us/individual/insights?q={q}' },
  { id:'bw',   name:'Bridgewater',       cat:'hedge',    color:'#6d28d9',
    url:'https://www.bridgewater.com/research-and-insights',
    searchUrl:'https://www.bridgewater.com/research-and-insights?q={q}' },
  { id:'aqr',  name:'AQR Capital',       cat:'hedge',    color:'#5b21b6',
    url:'https://www.aqr.com/Insights/Research',
    searchUrl:'https://www.aqr.com/Insights/Research?q={q}' },
  { id:'man',  name:'Man Group',         cat:'hedge',    color:'#a78bfa',
    url:'https://www.man.com/insights',
    searchUrl:'https://www.man.com/insights?query={q}' },
  // Official Institutions — have public RSS feeds for real article data
  { id:'imf',  name:'IMF Research',      cat:'official', color:'#b45309',
    url:'https://www.imf.org/en/Publications',
    rss:'https://www.imf.org/en/News/rss?category=WP',
    searchUrl:'https://www.imf.org/en/Publications/Search#sort=relevancy&q={q}' },
  { id:'wb',   name:'World Bank',        cat:'official', color:'#92400e',
    url:'https://openknowledge.worldbank.org',
    rss:'https://openknowledge.worldbank.org/handle/10986/2725/recent-submissions.atom',
    searchUrl:'https://openknowledge.worldbank.org/discover?query={q}' },
  { id:'bis',  name:'BIS',               cat:'official', color:'#d97706',
    url:'https://www.bis.org',
    rss:'https://www.bis.org/doclist/wppubls.rss',
    searchUrl:'https://www.bis.org/search/?searchwords={q}&bool=AND&paging=0&adv_list=en' },
  { id:'ecb',  name:'ECB Research',      cat:'official', color:'#f59e0b',
    url:'https://www.ecb.europa.eu/pub/research/html/index.en.html',
    rss:'https://www.ecb.europa.eu/rss/wps.html',
    searchUrl:'https://www.ecb.europa.eu/pub/research/html/index.en.html?search={q}' },
];

// Research category labels
export const RESEARCH_CAT_LABELS = { banks:'INVESTMENT BANKS', hedge:'HEDGE FUNDS & ASSET MANAGERS', official:'OFFICIAL INSTITUTIONS' };

// Commodity definitions
export const COMMOD_DEFS = [
  // Energy
  {symbol:'WTI',    name:'Crude Oil WTI',  sector:'energy',      unit:'$/bbl'},
  {symbol:'BRENT',  name:'Brent Crude',    sector:'energy',      unit:'$/bbl'},
  {symbol:'NATGAS', name:'Natural Gas',    sector:'energy',      unit:'$/MMBtu'},
  {symbol:'RBOB',   name:'Gasoline RBOB',  sector:'energy',      unit:'$/gal'},
  {symbol:'HOIL',   name:'Heating Oil',    sector:'energy',      unit:'$/gal'},
  {symbol:'COAL',   name:'Coal',           sector:'energy',      unit:'$/ton'},
  {symbol:'URAN',   name:'Uranium',        sector:'energy',      unit:'$/lb'},
  // Metals
  {symbol:'GOLD',   name:'Gold',           sector:'metals',      unit:'$/oz'},
  {symbol:'SILVER', name:'Silver',         sector:'metals',      unit:'$/oz'},
  {symbol:'PLAT',   name:'Platinum',       sector:'metals',      unit:'$/oz'},
  {symbol:'PALL',   name:'Palladium',      sector:'metals',      unit:'$/oz'},
  {symbol:'COPPER', name:'Copper',         sector:'metals',      unit:'$/lb'},
  {symbol:'ALUM',   name:'Aluminum',       sector:'metals',      unit:'$/ton'},
  {symbol:'ZINC',   name:'Zinc',           sector:'metals',      unit:'$/ton'},
  {symbol:'NICKEL', name:'Nickel',         sector:'metals',      unit:'$/ton'},
  {symbol:'LEAD',   name:'Lead',           sector:'metals',      unit:'$/ton'},
  {symbol:'STEEL',  name:'Steel HRC',      sector:'metals',      unit:'$/ton'},
  // Agriculture
  {symbol:'CORN',   name:'Corn',           sector:'agriculture', unit:'¢/bu'},
  {symbol:'WHEAT',  name:'Wheat',          sector:'agriculture', unit:'¢/bu'},
  {symbol:'SOYB',   name:'Soybeans',       sector:'agriculture', unit:'¢/bu'},
  {symbol:'COFFEE', name:'Coffee',         sector:'agriculture', unit:'¢/lb'},
  {symbol:'SUGAR',  name:'Sugar #11',      sector:'agriculture', unit:'¢/lb'},
  {symbol:'COTTON', name:'Cotton',         sector:'agriculture', unit:'¢/lb'},
  {symbol:'COCOA',  name:'Cocoa',          sector:'agriculture', unit:'$/ton'},
  {symbol:'CATTLE', name:'Live Cattle',    sector:'agriculture', unit:'¢/lb'},
  {symbol:'HOGS',   name:'Lean Hogs',      sector:'agriculture', unit:'¢/lb'},
  // Softs / Other
  {symbol:'LUMBER', name:'Lumber',         sector:'softs',       unit:'$/mbf'},
  {symbol:'OJ',     name:'Orange Juice',   sector:'softs',       unit:'¢/lb'},
  {symbol:'RUBBER', name:'Rubber',         sector:'softs',       unit:'¢/kg'},
];

// Commodities without YF data (LLM only)
export const COMMOD_LLM_ONLY = new Set(['COAL', 'STEEL', 'RUBBER']);

// FX pair definitions
export const FX_DEFS = [
  // G10
  {symbol:'EUR',region:'g10',   name:'Euro',              quote:'EUR/USD'},
  {symbol:'GBP',region:'g10',   name:'British Pound',     quote:'GBP/USD'},
  {symbol:'JPY',region:'g10',   name:'Japanese Yen',      quote:'USD/JPY'},
  {symbol:'CHF',region:'g10',   name:'Swiss Franc',       quote:'USD/CHF'},
  {symbol:'AUD',region:'g10',   name:'Aus Dollar',        quote:'AUD/USD'},
  {symbol:'NZD',region:'g10',   name:'NZ Dollar',         quote:'NZD/USD'},
  {symbol:'CAD',region:'g10',   name:'Canadian Dollar',   quote:'USD/CAD'},
  {symbol:'SEK',region:'g10',   name:'Swedish Krona',     quote:'USD/SEK'},
  {symbol:'NOK',region:'g10',   name:'Norwegian Krone',   quote:'USD/NOK'},
  // EM Asia
  {symbol:'CNY',region:'em_asia',name:'Chinese Yuan',     quote:'USD/CNY'},
  {symbol:'INR',region:'em_asia',name:'Indian Rupee',     quote:'USD/INR'},
  {symbol:'KRW',region:'em_asia',name:'Korean Won',       quote:'USD/KRW'},
  {symbol:'SGD',region:'em_asia',name:'Singapore Dollar', quote:'USD/SGD'},
  {symbol:'IDR',region:'em_asia',name:'Indonesian Rupiah',quote:'USD/IDR'},
  {symbol:'MYR',region:'em_asia',name:'Malaysian Ringgit',quote:'USD/MYR'},
  {symbol:'PHP',region:'em_asia',name:'Philippine Peso',  quote:'USD/PHP'},
  {symbol:'THB',region:'em_asia',name:'Thai Baht',        quote:'USD/THB'},
  {symbol:'TWD',region:'em_asia',name:'Taiwan Dollar',    quote:'USD/TWD'},
  // EM EMEA
  {symbol:'ZAR',region:'em_emea',name:'S.Africa Rand',   quote:'USD/ZAR'},
  {symbol:'TRY',region:'em_emea',name:'Turkish Lira',    quote:'USD/TRY'},
  {symbol:'PLN',region:'em_emea',name:'Polish Zloty',    quote:'USD/PLN'},
  {symbol:'HUF',region:'em_emea',name:'Hungarian Forint',quote:'USD/HUF'},
  {symbol:'CZK',region:'em_emea',name:'Czech Koruna',    quote:'USD/CZK'},
  {symbol:'ILS',region:'em_emea',name:'Israeli Shekel',  quote:'USD/ILS'},
  {symbol:'HKD',region:'em_emea',name:'HK Dollar',       quote:'USD/HKD'},
  // EM LatAm
  {symbol:'BRL',region:'em_latam',name:'Brazilian Real', quote:'USD/BRL'},
  {symbol:'MXN',region:'em_latam',name:'Mexican Peso',   quote:'USD/MXN'},
  {symbol:'CLP',region:'em_latam',name:'Chilean Peso',   quote:'USD/CLP'},
  {symbol:'COP',region:'em_latam',name:'Colombian Peso', quote:'USD/COP'},
  {symbol:'PEN',region:'em_latam',name:'Peruvian Sol',   quote:'USD/PEN'},
];

// FX pairs that quote as X/USD (inverted)
export const FX_INVERT = new Set(['EUR','GBP','AUD','NZD']);

// Community storage keys
export const COMM_LOCAL_KEY  = 'gmi_comm_local_posts';
export const COMM_OWNERS_KEY = 'gmi_comm_owners';
export const COMM_FB_KEY     = 'gmi_comm_fb_config';
export const COMM_COLL       = 'gmi-community-posts';
export const COMM_MAX_CHARS  = 600;
export const COMM_MAX_POSTS  = 200;

