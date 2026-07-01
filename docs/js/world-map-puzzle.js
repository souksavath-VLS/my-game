// World Map Puzzle — tap-to-select flag game, kids-friendly, mobile-first.
// Show a country name; tap the matching flag from 4 options.
// 100 countries, flags served by flagcdn.com (https://flagcdn.com).

// ---------- Country data (compact: [iso2, [labelTh,En,Lao], [capitalTh,En,Lao], color]) ----------
const COUNTRY_DATA = [
  // ===== Asia =====
  ['th', ['ประเทศไทย', 'Thailand', 'ປະເທດໄທ'], ['กรุงเทพฯ', 'Bangkok', 'ບາງກອກ'], '#ed1c24'],
  ['jp', ['ญี่ปุ่น', 'Japan', 'ຍີ່ປຸ່ນ'], ['โตเกียว', 'Tokyo', 'ໂຕກຽວ'], '#bc002d'],
  ['cn', ['จีน', 'China', 'ຈີນ'], ['ปักกิ่ง', 'Beijing', 'ປັກກິ່ງ'], '#de2910'],
  ['in', ['อินเดีย', 'India', 'ອິນເດຍ'], ['นิวเดลี', 'New Delhi', 'ນິວເດລີ'], '#ff9933'],
  ['ru', ['รัสเซีย', 'Russia', 'ລັດເຊຍ'], ['มอสโก', 'Moscow', 'ມັອດສະກູ'], '#0039a6'],
  ['kr', ['เกาหลีใต้', 'South Korea', 'ເກົາຫຼີໃຕ້'], ['โซล', 'Seoul', 'ໂຊລ'], '#003478'],
  ['kp', ['เกาหลีเหนือ', 'North Korea', 'ເກົາຫຼີເໜືອ'], ['เปียงยาง', 'Pyongyang', 'ປຽງຍາງ'], '#024fa2'],
  ['vn', ['เวียดนาม', 'Vietnam', 'ຫວຽດນາມ'], ['ฮานอย', 'Hanoi', 'ຮານອຍ'], '#da251d'],
  ['kh', ['กัมพูชา', 'Cambodia', 'ກຳປູເຈຍ'], ['พนมเปญ', 'Phnom Penh', 'ພະນົມເປັນ'], '#032ea1'],
  ['la', ['ลาว', 'Laos', 'ລາວ'], ['เวียงจันทน์', 'Vientiane', 'ວຽງຈັນ'], '#002868'],
  ['mm', ['เมียนมา', 'Myanmar', 'ມຽນມາ'], ['เนปยีดอ', 'Naypyidaw', 'ເນປິໂດ'], '#fecb00'],
  ['ph', ['ฟิลิปปินส์', 'Philippines', 'ຟີລິບປິນ'], ['มะนิลา', 'Manila', 'ມະນີລາ'], '#0038a8'],
  ['id', ['อินโดนีเซีย', 'Indonesia', 'ອິນໂດເນເຊຍ'], ['จาการ์ตา', 'Jakarta', 'ຈາກາຣ໌ຕາ'], '#ff0000'],
  ['my', ['มาเลเซีย', 'Malaysia', 'ມາເລເຊຍ'], ['กัวลาลัมเปอร์', 'Kuala Lumpur', 'ກົວລາລຳເປີ'], '#010066'],
  ['sg', ['สิงคโปร์', 'Singapore', 'ສິງກະໂປ'], ['สิงคโปร์', 'Singapore', 'ສິງກະໂປ'], '#ef3340'],
  ['pk', ['ปากีสถาน', 'Pakistan', 'ປາກິສຖານ'], ['อิสลามาบาด', 'Islamabad', 'ອິສລາມາບັດ'], '#01411c'],
  ['bd', ['บังกลาเทศ', 'Bangladesh', 'ບັງກະລາເທດ'], ['ธากา', 'Dhaka', 'ດາກາ'], '#006a4e'],
  ['lk', ['ศรีลังกา', 'Sri Lanka', 'ສີລັງກາ'], ['โคลัมโบ', 'Colombo', 'ໂຄລົມໂບ'], '#8d153a'],
  ['np', ['เนปาล', 'Nepal', 'ເນປານ'], ['กาฐมาณฑุ', 'Kathmandu', 'ກາຖະມັນດູ'], '#dc143c'],
  ['bt', ['ภูฏาน', 'Bhutan', 'ພູຖານ'], ['ทิมพู', 'Thimphu', 'ທິມພູ'], '#ffcc33'],
  ['mn', ['มองโกเลีย', 'Mongolia', 'ມົງໂກເລຍ'], ['อูลานบาตอร์', 'Ulaanbaatar', 'ອູລານບາຕໍ'], '#c4272f'],
  ['kz', ['คาซัคสถาน', 'Kazakhstan', 'ກາຊັກສະຖານ'], ['อัสตานา', 'Astana', 'ອັສຕານາ'], '#00afca'],
  ['uz', ['อุซเบกิสถาน', 'Uzbekistan', 'ອຸສເບກິສຖານ'], ['ทาชเคนต์', 'Tashkent', 'ຕັດຊະເຄນ'], '#1eb53a'],
  ['ir', ['อิหร่าน', 'Iran', 'ອີຣ່ານ'], ['เตหะราน', 'Tehran', 'ເຕຫະຣານ'], '#239f40'],
  ['iq', ['อิรัก', 'Iraq', 'ອີຣັກ'], ['แบกแดด', 'Baghdad', 'ແບກແດດ'], '#ce1126'],
  ['il', ['อิสราเอล', 'Israel', 'ອິສຣາແອລ'], ['เยรูซาเลม', 'Jerusalem', 'ເຢຣູຊາແລັມ'], '#0038b8'],
  ['tr', ['ตุรกี', 'Turkey', 'ຕວກກີ'], ['อังการา', 'Ankara', 'ອັງກາຣາ'], '#e30a17'],
  ['sa', ['ซาอุดีอาระเบีย', 'Saudi Arabia', 'ຊາອຸດີອາຣາເບຍ'], ['ริยาด', 'Riyadh', 'ຣິຍາດ'], '#006c35'],
  ['ae', ['สหรัฐอาหรับเอมิเรตส์', 'United Arab Emirates', 'ສະຫະລັດອາຣັບເອມິເຣດ'], ['อาบูดาบี', 'Abu Dhabi', 'ອາບູດາບີ'], '#00732f'],
  ['qa', ['กาตาร์', 'Qatar', 'ກາຕາ'], ['โดฮา', 'Doha', 'ໂດຮາ'], '#8a1538'],
  ['af', ['อัฟกานิสถาน', 'Afghanistan', 'ອັຟການິສຖານ'], ['คาบูล', 'Kabul', 'ກາບູລ'], '#000000'],
  ['tw', ['ไต้หวัน', 'Taiwan', 'ໄຕ້ຫວັນ'], ['ไทเป', 'Taipei', 'ໄທເປ'], '#fe0000'],

  // ===== Europe =====
  ['gb', ['สหราชอาณาจักร', 'United Kingdom', 'ສະຫະລາດຊະອານາຈັກ'], ['ลอนดอน', 'London', 'ລອນດອນ'], '#00247d'],
  ['fr', ['ฝรั่งเศส', 'France', 'ຝຣັ່ງ'], ['ปารีส', 'Paris', 'ປາຣີ'], '#0055a4'],
  ['de', ['เยอรมนี', 'Germany', 'ເຢຍລະມັນ'], ['เบอร์ลิน', 'Berlin', 'ເບີລິນ'], '#000000'],
  ['it', ['อิตาลี', 'Italy', 'ອີຕາລີ'], ['โรม', 'Rome', 'ໂຣມ'], '#009246'],
  ['es', ['สเปน', 'Spain', 'ສະເປນ'], ['มาดริด', 'Madrid', 'ມັດດຣິດ'], '#aa1c39'],
  ['pt', ['โปรตุเกส', 'Portugal', 'ປໍຕຸຍການ'], ['ลิสบอน', 'Lisbon', 'ລິສບອນ'], '#006600'],
  ['nl', ['เนเธอร์แลนด์', 'Netherlands', 'ເນເທີແລນ'], ['อัมสเตอร์ดัม', 'Amsterdam', 'ອຳສະເຕີດຳ'], '#ae1c28'],
  ['be', ['เบลเยียม', 'Belgium', 'ແບນຊິກ'], ['บรัสเซลส์', 'Brussels', 'ບຣຸກແຊລ'], '#fdda24'],
  ['gr', ['กรีซ', 'Greece', 'ກຣິກ'], ['เอเธนส์', 'Athens', 'ອາແທນ'], '#0d5eaf'],
  ['ch', ['สวิตเซอร์แลนด์', 'Switzerland', 'ສະວິດເຊີແລນ'], ['เบิร์น', 'Bern', 'ແບີນ'], '#ff0000'],
  ['at', ['ออสเตรีย', 'Austria', 'ອອສຕີຣິຍາ'], ['เวียนนา', 'Vienna', 'ວຽນນາ'], '#ed2939'],
  ['se', ['สวีเดน', 'Sweden', 'ສະວີເດນ'], ['สตอกโฮล์ม', 'Stockholm', 'ສະຕັອກໂຮມ'], '#005293'],
  ['no', ['นอร์เวย์', 'Norway', 'ນໍເວ'], ['ออสโล', 'Oslo', 'ອອສໂລ'], '#ba0c2f'],
  ['dk', ['เดนมาร์ก', 'Denmark', 'ເດນມາກ'], ['โคเปนเฮเกน', 'Copenhagen', 'ໂກເປນຮາເກນ'], '#c8102e'],
  ['fi', ['ฟินแลนด์', 'Finland', 'ຟິນແລນ'], ['เฮลซิงกิ', 'Helsinki', 'ເຮນຊິງກີ'], '#003580'],
  ['pl', ['โปแลนด์', 'Poland', 'ໂປແລນ'], ['วอร์ซอ', 'Warsaw', 'ວໍຊໍ'], '#dc143c'],
  ['cz', ['เช็กเกีย', 'Czech Republic', 'ສາທາລະນະລັດເຊກ'], ['ปราก', 'Prague', 'ປຣາກ'], '#11457e'],
  ['hu', ['ฮังการี', 'Hungary', 'ຮັງກາຣີ'], ['บูดาเปสต์', 'Budapest', 'ບູດາເປສ'], '#436f4d'],
  ['ie', ['ไอร์แลนด์', 'Ireland', 'ໄອແລນ'], ['ดับลิน', 'Dublin', 'ດັບລິນ'], '#169b62'],
  ['is', ['ไอซ์แลนด์', 'Iceland', 'ໄອສ໌ແລນ'], ['เรคยาวิก', 'Reykjavik', 'ເຣກຢາວິກ'], '#02529c'],
  ['ua', ['ยูเครน', 'Ukraine', 'ຢູເຄຣນ'], ['เคียฟ', 'Kyiv', 'ກີຍິບ'], '#0057b7'],
  ['ro', ['โรมาเนีย', 'Romania', 'ໂຣມາເນຍ'], ['บูคาเรสต์', 'Bucharest', 'ບູຄາເຣສ'], '#002b7f'],
  ['bg', ['บัลแกเรีย', 'Bulgaria', 'ບັນກາເຣຍ'], ['โซเฟีย', 'Sofia', 'ໂຊເຟຍ'], '#00966e'],
  ['hr', ['โครเอเชีย', 'Croatia', 'ໂຄຣເອເຊຍ'], ['ซาเกร็บ', 'Zagreb', 'ຊາເກຣບ'], '#171796'],

  // ===== Americas =====
  ['us', ['สหรัฐอเมริกา', 'United States', 'ສະຫະລັດອາເມຣິກາ'], ['วอชิงตัน ดี.ซี.', 'Washington, D.C.', 'ວໍຊິງຕັນ ດີຊີ'], '#3c3b6e'],
  ['ca', ['แคนาดา', 'Canada', 'ການາດາ'], ['ออตตาวา', 'Ottawa', 'ອັອດຕາວາ'], '#ff0000'],
  ['mx', ['เม็กซิโก', 'Mexico', 'ແມັກຊິໂກ'], ['เม็กซิโกซิตี', 'Mexico City', 'ແມັກຊິໂກຊິຕີ'], '#006847'],
  ['br', ['บราซิล', 'Brazil', 'ບຣາຊິນ'], ['บราซิเลีย', 'Brasília', 'ບຣາຊີເລຍ'], '#009c3b'],
  ['ar', ['อาร์เจนตินา', 'Argentina', 'ອາເຈນຕີນາ'], ['บัวโนสไอเรส', 'Buenos Aires', 'ບົວໂນສ໌ໄອເຣສ'], '#74acdf'],
  ['cl', ['ชิลี', 'Chile', 'ຊີລີ'], ['ซานเตียโก', 'Santiago', 'ຊານທຽໂກ'], '#d52b1e'],
  ['pe', ['เปรู', 'Peru', 'ເປຣູ'], ['ลิมา', 'Lima', 'ລີມາ'], '#d91023'],
  ['co', ['โคลอมเบีย', 'Colombia', 'ໂຄລົມເບຍ'], ['โบโกตา', 'Bogotá', 'ໂບໂກຕາ'], '#fcd116'],
  ['ve', ['เวเนซุเอลา', 'Venezuela', 'ເວເນຊູເອລາ'], ['การากัส', 'Caracas', 'ກາຣາກັສ'], '#ffcc00'],
  ['cu', ['คิวบา', 'Cuba', 'ຄິວບາ'], ['ฮาวานา', 'Havana', 'ຮາວານາ'], '#002a8f'],
  ['uy', ['อุรุกวัย', 'Uruguay', 'ອູຣຸກວາຍ'], ['มอนเตวิเดโอ', 'Montevideo', 'ມັອນເຕວິເດໂອ'], '#7b9fcf'],
  ['bo', ['โบลิเวีย', 'Bolivia', 'ໂບລິເວຍ'], ['ลาปาซ', 'La Paz', 'ລາປາສ'], '#d52b1e'],
  ['ec', ['เอกวาดอร์', 'Ecuador', 'ເອກວາດໍ'], ['กีโต', 'Quito', 'ກີໂຕ'], '#ffdd00'],
  ['cr', ['คอสตาริกา', 'Costa Rica', 'ຄອສຕາຣິກາ'], ['ซานโฮเซ', 'San José', 'ຊານໂຮເຊ'], '#002b7f'],
  ['pa', ['ปานามา', 'Panama', 'ປານາມາ'], ['ปานามาซิตี', 'Panama City', 'ປານາມາຊິຕີ'], '#005aa7'],

  // ===== Africa =====
  ['eg', ['อียิปต์', 'Egypt', 'ອີຢິບ'], ['ไคโร', 'Cairo', 'ໄຄໂຣ'], '#ce1126'],
  ['za', ['แอฟริกาใต้', 'South Africa', 'ອາຟຣິກາໃຕ້'], ['พริทอเรีย', 'Pretoria', 'ພຣິໂທເຣຍ'], '#007a4d'],
  ['ng', ['ไนจีเรีย', 'Nigeria', 'ໄນຈີເຣຍ'], ['อาบูจา', 'Abuja', 'ອາບູຈາ'], '#008751'],
  ['ke', ['เคนยา', 'Kenya', 'ເຄນຢາ'], ['ไนโรบี', 'Nairobi', 'ໄນໂຣບີ'], '#bb0000'],
  ['ma', ['โมร็อกโก', 'Morocco', 'ໂມຣັອກໂກ'], ['ราบัต', 'Rabat', 'ຣາບັດ'], '#c1272d'],
  ['et', ['เอธิโอเปีย', 'Ethiopia', 'ເອທີໂອເປຍ'], ['แอดดิสอาบาบา', 'Addis Ababa', 'ອັດດິສອາບາບາ'], '#078930'],
  ['gh', ['กานา', 'Ghana', 'ການາ'], ['อักกรา', 'Accra', 'ອັກກຣາ'], '#ce1126'],
  ['tn', ['ตูนิเซีย', 'Tunisia', 'ຕູນີເຊຍ'], ['ตูนิส', 'Tunis', 'ຕູນິສ'], '#e70013'],
  ['dz', ['แอลจีเรีย', 'Algeria', 'ອັນຈີເຣຍ'], ['แอลเจียร์', 'Algiers', 'ອັນຈີ'], '#006233'],
  ['tz', ['แทนซาเนีย', 'Tanzania', 'ແທນຊາເນຍ'], ['โดโดมา', 'Dodoma', 'ໂດໂດມາ'], '#1eb53a'],
  ['sn', ['เซเนกัล', 'Senegal', 'ເຊເນການ'], ['ดาการ์', 'Dakar', 'ດາກາ'], '#00853f'],
  ['ug', ['ยูกันดา', 'Uganda', 'ຢູການດາ'], ['กัมปาลา', 'Kampala', 'ກຳປາລາ'], '#fcdc04'],
  ['cm', ['แคเมอรูน', 'Cameroon', 'ການເມຣູນ'], ['ยาอุนเด', 'Yaoundé', 'ຢາອຸນເດ'], '#007a5e'],
  ['zw', ['ซิมบับเว', 'Zimbabwe', 'ຊິມບັບເວ'], ['ฮาราเร', 'Harare', 'ຮາຣາເຣ'], '#006400'],

  // ===== Oceania =====
  ['au', ['ออสเตรเลีย', 'Australia', 'ອອສຕຣາລີ'], ['แคนเบอร์รา', 'Canberra', 'ແຄນເບີຣາ'], '#012169'],
  ['nz', ['นิวซีแลนด์', 'New Zealand', 'ນິວຊີແລນ'], ['เวลลิงตัน', 'Wellington', 'ເວລລິງຕັນ'], '#012169'],
  ['fj', ['ฟิจิ', 'Fiji', 'ຟິຈິ'], ['ซูวา', 'Suva', 'ຊູວາ'], '#68bfe5'],
  ['pg', ['ปาปัวนิวกินี', 'Papua New Guinea', 'ປາປົວນິວກີນີ'], ['พอร์ตมอร์สบี', 'Port Moresby', 'ພອດມໍສ໌ບີ'], '#ce1126'],
  ['ws', ['ซามัว', 'Samoa', 'ຊາມົວ'], ['อาเปีย', 'Apia', 'ອາເປຍ'], '#002b7f'],

  // ===== Caribbean & misc =====
  ['jm', ['จาเมกา', 'Jamaica', 'ຈາແມກາ'], ['คิงสตัน', 'Kingston', 'ຄິງສະຕັນ'], '#009b3a'],
  ['do', ['สาธารณรัฐโดมินิกัน', 'Dominican Republic', 'ສາທາລະນະລັດໂດມິນິກາ'], ['ซานโตโดมิงโก', 'Santo Domingo', 'ຊານໂຕໂດມິງໂກ'], '#002d62'],
  ['ht', ['เฮติ', 'Haiti', 'ໄຮຕີ'], ['ปอร์โตแปรงซ์', 'Port-au-Prince', 'ປໍຕໍແປຣງສ໌'], '#00209f'],
  ['bs', ['บาฮามาส', 'Bahamas', 'ບາຮາມາສ'], ['แนสซอ', 'Nassau', 'ແນສຊໍ'], '#00778b'],
  ['tt', ['ตรินิแดดและโตเบโก', 'Trinidad and Tobago', 'ຕຣິນິແດດແລະໂຕເບໂກ'], ['พอร์ตออฟสเปน', 'Port of Spain', 'ພອດອັອບສະເປນ'], '#ce1126'],
  ['mu', ['มอริเชียส', 'Mauritius', 'ມໍຣິຊຽສ'], ['พอร์ตหลุยส์', 'Port Louis', 'ພອດລຸຍ'], '#1a206d'],
  ['mg', ['มาดากัสการ์', 'Madagascar', 'ມາດາກັສກາ'], ['อันตานานาริโว', 'Antananarivo', 'ອັນຕານານາຣິໂວ'], '#fc3d32'],
  ['lb', ['เลบานอน', 'Lebanon', 'ເລບານອນ'], ['เบรุต', 'Beirut', 'ເບຣຸດ'], '#ed1c24'],
  ['jo', ['จอร์แดน', 'Jordan', 'ຈໍແດນ'], ['อัมมาน', 'Amman', 'ອຳມານ'], '#000000'],
  ['sy', ['ซีเรีย', 'Syria', 'ຊີເຣຍ'], ['ดามัสกัส', 'Damascus', 'ດາມັສກັສ'], '#ce1126']
];

const COUNTRIES = COUNTRY_DATA.map(([key, label, capital, color]) => ({
  key,
  label:   { th: label[0],   en: label[1],   lao: label[2] },
  capital: { th: capital[0], en: capital[1], lao: capital[2] },
  flag: `https://flagcdn.com/w320/${key}.png`,
  color
}));

// ---------- Settings ----------
const ROUNDS_PER_GAME = 10;
const OPTIONS_PER_ROUND = 4;

// ---------- State ----------
let lang = 'en';
let roundIndex = 0;
let target = null;
let optionsThisRound = [];
let answered = false;
let correctCount = 0;
let wrongCount = 0;
let usedKeys = new Set();
let startTime = 0;
let timerHandle = null;
let bestStats = JSON.parse(localStorage.getItem('worldMapBest') || 'null');

// ---------- Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.4;
masterGain.connect(audioCtx.destination);
let muted = localStorage.getItem('worldMapMuted') === '1';
function applyMute() { masterGain.gain.value = muted ? 0 : 0.4; }
applyMute();
function toggleMute() {
  muted = !muted;
  localStorage.setItem('worldMapMuted', muted ? '1' : '0');
  applyMute();
  const btn = document.getElementById('wm-mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}
window.worldMapToggleMute = toggleMute;

function beep({ type = 'square', freq = 600, freqEnd = null, duration = 0.12, gain = 0.35 }) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (freqEnd !== null) o.frequency.linearRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
  o.connect(g); g.connect(masterGain);
  o.start();
  o.stop(audioCtx.currentTime + duration);
}
function sndCorrect() {
  beep({ type: 'triangle', freq: 700, freqEnd: 1000, duration: 0.10, gain: 0.35 });
  setTimeout(() => beep({ type: 'triangle', freq: 1000, freqEnd: 1400, duration: 0.15, gain: 0.35 }), 90);
}
function sndWrong() { beep({ type: 'sawtooth', freq: 300, freqEnd: 150, duration: 0.18, gain: 0.35 }); }
function sndComplete() {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => beep({ type: 'triangle', freq: f, duration: 0.18, gain: 0.4 }), i * 130);
  });
}

// ---------- Language ----------
function getLang() {
  let l = localStorage.getItem('lang') || 'en';
  if (!['th', 'en', 'lao'].includes(l)) l = 'en';
  return l;
}

// ---------- Round logic ----------
function pickNextTarget() {
  const unused = COUNTRIES.filter(c => !usedKeys.has(c.key));
  const pool = unused.length > 0 ? unused : COUNTRIES;
  const t = pool[Math.floor(Math.random() * pool.length)];
  usedKeys.add(t.key);
  return t;
}

function pickOptions(targetCountry) {
  const others = COUNTRIES.filter(c => c.key !== targetCountry.key);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const opts = [targetCountry, ...others.slice(0, OPTIONS_PER_ROUND - 1)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function startRound() {
  answered = false;
  target = pickNextTarget();
  optionsThisRound = pickOptions(target);
  renderRound();
}

function speakTarget() {
  if (!target) return;
  const text = target.label[lang] || target.label.en;
  const v = lang === 'th' ? 'th-TH' : lang === 'lao' ? 'lo-LA' : 'en-US';
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    try { window.AndroidTTS.speak(text, v); return; } catch {}
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

function renderRound() {
  const promptEl = document.getElementById('wm-prompt');
  promptEl.textContent = target.label[lang];
  promptEl.style.color = target.color;
  // Make the country name tappable to hear again
  promptEl.style.cursor = 'pointer';
  promptEl.onclick = speakTarget;

  const subtitle = document.getElementById('wm-prompt-sub');
  const t = window.worldMapLang || {};
  subtitle.textContent = t.findFlag || 'Find the flag of:';

  // Speak the target country name so kids hear the pronunciation
  speakTarget();

  document.getElementById('wm-capital').textContent = '';
  document.getElementById('wm-round').textContent = `${roundIndex + 1} / ${ROUNDS_PER_GAME}`;

  const grid = document.getElementById('wm-flag-grid');
  grid.innerHTML = '';
  for (const opt of optionsThisRound) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'wm-flag-card';
    card.dataset.key = opt.key;
    const img = document.createElement('img');
    img.src = opt.flag;
    img.alt = ''; // intentionally blank — alt would give the answer to screen readers
    img.loading = 'lazy';
    card.appendChild(img);
    card.addEventListener('click', () => onFlagTap(card, opt));
    grid.appendChild(card);
  }
}

function onFlagTap(card, picked) {
  if (answered) return;
  if (picked.key === target.key) {
    answered = true;
    correctCount++;
    card.classList.add('correct');
    sndCorrect();
    document.querySelectorAll('.wm-flag-card').forEach(c => {
      if (c !== card) c.classList.add('dim');
    });
    document.getElementById('wm-capital').textContent =
      `🏛 ${(window.worldMapLang && window.worldMapLang.capital) || 'Capital'}: ${target.capital[lang]}`;
    updateStats();
    setTimeout(advanceRound, 1500);
  } else {
    wrongCount++;
    card.classList.add('wrong');
    sndWrong();
    updateStats();
    setTimeout(() => card.classList.remove('wrong'), 600);
  }
}

function advanceRound() {
  roundIndex++;
  if (roundIndex >= ROUNDS_PER_GAME) {
    finishGame();
  } else {
    startRound();
  }
}

function finishGame() {
  stopTimer();
  sndComplete();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const beat = !bestStats
    || wrongCount < bestStats.wrong
    || (wrongCount === bestStats.wrong && elapsed < bestStats.time);
  if (beat) {
    bestStats = { wrong: wrongCount, time: elapsed };
    localStorage.setItem('worldMapBest', JSON.stringify(bestStats));
  }
  showResultModal(elapsed, beat);
  updateBestDisplay();
}

function showResultModal(elapsedSec, beat) {
  const modal = document.getElementById('wm-result-modal');
  if (!modal) return;
  document.getElementById('wm-result-correct').textContent = correctCount;
  document.getElementById('wm-result-wrong').textContent = wrongCount;
  document.getElementById('wm-result-time').textContent = formatTime(elapsedSec);
  const newTag = document.getElementById('wm-new-record');
  if (newTag) newTag.style.display = beat ? '' : 'none';
  modal.style.display = 'flex';
}
function hideResultModal() {
  const modal = document.getElementById('wm-result-modal');
  if (modal) modal.style.display = 'none';
}

// ---------- UI helpers ----------
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateStats() {
  document.getElementById('wm-correct').textContent = correctCount;
  document.getElementById('wm-wrong').textContent = wrongCount;
}

function updateBestDisplay() {
  const el = document.getElementById('wm-best');
  if (!el) return;
  if (bestStats) {
    el.textContent = `${ROUNDS_PER_GAME - bestStats.wrong}/${ROUNDS_PER_GAME} · ${formatTime(bestStats.time)}`;
  } else {
    el.textContent = '—';
  }
}

function startTimer() {
  startTime = Date.now();
  stopTimer();
  const update = () => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById('wm-time');
    if (el) el.textContent = formatTime(sec);
  };
  update();
  timerHandle = setInterval(update, 500);
}
function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

// ---------- Game lifecycle ----------
function startNewGame() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  hideResultModal();
  lang = getLang();
  roundIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  usedKeys = new Set();
  updateStats();
  updateBestDisplay();
  startTimer();
  startRound();
}
window.worldMapStartNewGame = startNewGame;

function skipCurrent() {
  if (answered) return;
  wrongCount++;
  updateStats();
  const cards = document.querySelectorAll('.wm-flag-card');
  cards.forEach(c => {
    if (c.dataset.key === target.key) c.classList.add('correct');
    else c.classList.add('dim');
  });
  document.getElementById('wm-capital').textContent =
    `🏛 ${(window.worldMapLang && window.worldMapLang.capital) || 'Capital'}: ${target.capital[lang]}`;
  answered = true;
  setTimeout(advanceRound, 1200);
}
window.worldMapSkip = skipCurrent;

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  lang = getLang();

  const muteBtn = document.getElementById('wm-mute-btn');
  if (muteBtn) {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', toggleMute);
  }
  const newGameBtn = document.getElementById('wm-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
  const replayBtn = document.getElementById('wm-replay-btn');
  if (replayBtn) replayBtn.addEventListener('click', startNewGame);
  const skipBtn = document.getElementById('wm-skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', skipCurrent);

  updateBestDisplay();
  startNewGame();
});
