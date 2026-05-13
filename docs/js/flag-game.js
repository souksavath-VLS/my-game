// Flag Game — Learn + Quiz modes, continent filter, multi-language, progress tracking
// 193 UN member/observer states with ISO 2-letter codes, English/Thai/Lao names, continent.
// Flag images from https://flagcdn.com/ (consistent SVG, free, no API key).

(() => {
  'use strict';

  // ===== Country dataset (alphabetical by English) =====
  // c = ISO 2-letter, e = English, t = Thai, l = Lao, k = continent key
  const COUNTRIES = [
    { c:'af', e:'Afghanistan', t:'อัฟกานิสถาน', l:'ອັຟການິສຖານ', k:'asia' },
    { c:'al', e:'Albania', t:'แอลเบเนีย', l:'ແອວບາເນຍ', k:'europe' },
    { c:'dz', e:'Algeria', t:'แอลจีเรีย', l:'ແອລຈີເຣຍ', k:'africa' },
    { c:'ad', e:'Andorra', t:'อันดอร์รา', l:'ອັນດໍຣາ', k:'europe' },
    { c:'ao', e:'Angola', t:'แองโกลา', l:'ແອງໂກລາ', k:'africa' },
    { c:'ag', e:'Antigua and Barbuda', t:'แอนติกาและบาร์บูดา', l:'ແອນຕີກາ ແລະ ບາບູດາ', k:'americas' },
    { c:'ar', e:'Argentina', t:'อาร์เจนตินา', l:'ອາເຈນຕີນາ', k:'americas' },
    { c:'am', e:'Armenia', t:'อาร์เมเนีย', l:'ອາກເມເນຍ', k:'asia' },
    { c:'au', e:'Australia', t:'ออสเตรเลีย', l:'ອອສເຕຣເລຍ', k:'oceania' },
    { c:'at', e:'Austria', t:'ออสเตรีย', l:'ອອສເຕຣຍ', k:'europe' },
    { c:'az', e:'Azerbaijan', t:'อาเซอร์ไบจาน', l:'ອາເຊີໄບຈານ', k:'asia' },
    { c:'bs', e:'Bahamas', t:'บาฮามาส', l:'ບາຮາມາສ', k:'americas' },
    { c:'bh', e:'Bahrain', t:'บาห์เรน', l:'ບາເຣນ', k:'asia' },
    { c:'bd', e:'Bangladesh', t:'บังกลาเทศ', l:'ບັງກະລາເທດ', k:'asia' },
    { c:'bb', e:'Barbados', t:'บาร์เบโดส', l:'ບາເບໂດສ', k:'americas' },
    { c:'by', e:'Belarus', t:'เบลารุส', l:'ເບລາຣຸສ', k:'europe' },
    { c:'be', e:'Belgium', t:'เบลเยียม', l:'ແບນຊິກ', k:'europe' },
    { c:'bz', e:'Belize', t:'เบลีซ', l:'ເບລີສ', k:'americas' },
    { c:'bj', e:'Benin', t:'เบนิน', l:'ເບນິນ', k:'africa' },
    { c:'bt', e:'Bhutan', t:'ภูฏาน', l:'ພູຖານ', k:'asia' },
    { c:'bo', e:'Bolivia', t:'โบลิเวีย', l:'ໂບລີເວຍ', k:'americas' },
    { c:'ba', e:'Bosnia and Herzegovina', t:'บอสเนียและเฮอร์เซโกวีนา', l:'ບອສເນຍ ແລະ ແຮກເຊໂກວີນາ', k:'europe' },
    { c:'bw', e:'Botswana', t:'บอตสวานา', l:'ບອດສະວານາ', k:'africa' },
    { c:'br', e:'Brazil', t:'บราซิล', l:'ບຣາຊິນ', k:'americas' },
    { c:'bn', e:'Brunei', t:'บรูไน', l:'ບຣູໄນ', k:'asia' },
    { c:'bg', e:'Bulgaria', t:'บัลแกเรีย', l:'ບຸນກາເຣຍ', k:'europe' },
    { c:'bf', e:'Burkina Faso', t:'บูร์กินาฟาโซ', l:'ບູກິນາຟາໂຊ', k:'africa' },
    { c:'bi', e:'Burundi', t:'บุรุนดี', l:'ບູຣຸນດີ', k:'africa' },
    { c:'cv', e:'Cabo Verde', t:'กาบูเวร์ดี', l:'ກາໂບເວເດ', k:'africa' },
    { c:'kh', e:'Cambodia', t:'กัมพูชา', l:'ກຳປູເຈຍ', k:'asia' },
    { c:'cm', e:'Cameroon', t:'แคเมอรูน', l:'ກາເມຣູນ', k:'africa' },
    { c:'ca', e:'Canada', t:'แคนาดา', l:'ການາດາ', k:'americas' },
    { c:'cf', e:'Central African Republic', t:'แอฟริกากลาง', l:'ສປ.ອາຟຣິກາກາງ', k:'africa' },
    { c:'td', e:'Chad', t:'ชาด', l:'ຊາດ', k:'africa' },
    { c:'cl', e:'Chile', t:'ชิลี', l:'ຊິລີ', k:'americas' },
    { c:'cn', e:'China', t:'จีน', l:'ຈີນ', k:'asia' },
    { c:'co', e:'Colombia', t:'โคลอมเบีย', l:'ໂກລົມເບຍ', k:'americas' },
    { c:'km', e:'Comoros', t:'คอโมโรส', l:'ກອໂມໂຣສ', k:'africa' },
    { c:'cg', e:'Congo', t:'คองโก', l:'ກົງໂກ', k:'africa' },
    { c:'cr', e:'Costa Rica', t:'คอสตาริกา', l:'ກອສຕາລິກາ', k:'americas' },
    { c:'hr', e:'Croatia', t:'โครเอเชีย', l:'ໂກຣອາເຊຍ', k:'europe' },
    { c:'cu', e:'Cuba', t:'คิวบา', l:'ກູບາ', k:'americas' },
    { c:'cy', e:'Cyprus', t:'ไซปรัส', l:'ໄຊປຣັສ', k:'asia' },
    { c:'cz', e:'Czech Republic', t:'เช็ก', l:'ສປ.ເຊັກ', k:'europe' },
    { c:'dk', e:'Denmark', t:'เดนมาร์ก', l:'ເດນມາກ', k:'europe' },
    { c:'dj', e:'Djibouti', t:'จิบูตี', l:'ຈິບູຕີ', k:'africa' },
    { c:'dm', e:'Dominica', t:'โดมินิกา', l:'ໂດມີນິກາ', k:'americas' },
    { c:'do', e:'Dominican Republic', t:'โดมินิกัน', l:'ສປ.ໂດມີນິກັນ', k:'americas' },
    { c:'ec', e:'Ecuador', t:'เอกวาดอร์', l:'ເອກວາດໍ', k:'americas' },
    { c:'eg', e:'Egypt', t:'อียิปต์', l:'ອີຍິບ', k:'africa' },
    { c:'sv', e:'El Salvador', t:'เอลซัลวาดอร์', l:'ແອວຊາວວາດໍ', k:'americas' },
    { c:'gq', e:'Equatorial Guinea', t:'อิเควทอเรียลกินี', l:'ກິເນອີຄົວເຕີຣຽວ', k:'africa' },
    { c:'er', e:'Eritrea', t:'เอริเทรีย', l:'ເອຣິເທຣຍ', k:'africa' },
    { c:'ee', e:'Estonia', t:'เอสโตเนีย', l:'ເອສໂຕເນຍ', k:'europe' },
    { c:'sz', e:'Eswatini', t:'เอสวาตินี', l:'ເອສວາຕີນີ', k:'africa' },
    { c:'et', e:'Ethiopia', t:'เอธิโอเปีย', l:'ເອທິໂອເປຍ', k:'africa' },
    { c:'fj', e:'Fiji', t:'ฟิจิ', l:'ຟິຈິ', k:'oceania' },
    { c:'fi', e:'Finland', t:'ฟินแลนด์', l:'ຟິນແລນ', k:'europe' },
    { c:'fr', e:'France', t:'ฝรั่งเศส', l:'ຝຣັ່ງ', k:'europe' },
    { c:'ga', e:'Gabon', t:'กาบอง', l:'ກາບົງ', k:'africa' },
    { c:'gm', e:'Gambia', t:'แกมเบีย', l:'ແກມເບຍ', k:'africa' },
    { c:'ge', e:'Georgia', t:'จอร์เจีย', l:'ຈໍຈເຈຍ', k:'asia' },
    { c:'de', e:'Germany', t:'เยอรมนี', l:'ເຢຍລະມັນ', k:'europe' },
    { c:'gh', e:'Ghana', t:'กานา', l:'ການາ', k:'africa' },
    { c:'gr', e:'Greece', t:'กรีซ', l:'ກຣິກ', k:'europe' },
    { c:'gd', e:'Grenada', t:'เกรเนดา', l:'ເກຣເນດາ', k:'americas' },
    { c:'gt', e:'Guatemala', t:'กัวเตมาลา', l:'ກົວເຕມາລາ', k:'americas' },
    { c:'gn', e:'Guinea', t:'กินี', l:'ກິເນ', k:'africa' },
    { c:'gw', e:'Guinea-Bissau', t:'กินีบิสเซา', l:'ກິເນບີຊາວ', k:'africa' },
    { c:'gy', e:'Guyana', t:'กายอานา', l:'ກາຍຢານາ', k:'americas' },
    { c:'ht', e:'Haiti', t:'เฮติ', l:'ໄຮຕີ', k:'americas' },
    { c:'hn', e:'Honduras', t:'ฮอนดูรัส', l:'ຮົງດູຣັສ', k:'americas' },
    { c:'hu', e:'Hungary', t:'ฮังการี', l:'ຮົງກາລີ', k:'europe' },
    { c:'is', e:'Iceland', t:'ไอซ์แลนด์', l:'ໄອສະແລນ', k:'europe' },
    { c:'in', e:'India', t:'อินเดีย', l:'ອິນເດຍ', k:'asia' },
    { c:'id', e:'Indonesia', t:'อินโดนีเซีย', l:'ອິນໂດເນເຊຍ', k:'asia' },
    { c:'ir', e:'Iran', t:'อิหร่าน', l:'ອີຣ່ານ', k:'asia' },
    { c:'iq', e:'Iraq', t:'อิรัก', l:'ອີຣັກ', k:'asia' },
    { c:'ie', e:'Ireland', t:'ไอร์แลนด์', l:'ໄອແລນ', k:'europe' },
    { c:'il', e:'Israel', t:'อิสราเอล', l:'ອິສຣາແອວ', k:'asia' },
    { c:'it', e:'Italy', t:'อิตาลี', l:'ອີຕາລີ', k:'europe' },
    { c:'jm', e:'Jamaica', t:'จาเมกา', l:'ຈາໄມກາ', k:'americas' },
    { c:'jp', e:'Japan', t:'ญี่ปุ่น', l:'ຍີ່ປຸ່ນ', k:'asia' },
    { c:'jo', e:'Jordan', t:'จอร์แดน', l:'ຈໍແດນ', k:'asia' },
    { c:'kz', e:'Kazakhstan', t:'คาซัคสถาน', l:'ກາຊັກສຖານ', k:'asia' },
    { c:'ke', e:'Kenya', t:'เคนยา', l:'ເຄນຢາ', k:'africa' },
    { c:'ki', e:'Kiribati', t:'คิริบาส', l:'ກິລິບາສ', k:'oceania' },
    { c:'kw', e:'Kuwait', t:'คูเวต', l:'ກູເວດ', k:'asia' },
    { c:'kg', e:'Kyrgyzstan', t:'คีร์กีซสถาน', l:'ກິກກິສຖານ', k:'asia' },
    { c:'la', e:'Laos', t:'ลาว', l:'ລາວ', k:'asia' },
    { c:'lv', e:'Latvia', t:'ลัตเวีย', l:'ລັດເວຍ', k:'europe' },
    { c:'lb', e:'Lebanon', t:'เลบานอน', l:'ເລບານອນ', k:'asia' },
    { c:'ls', e:'Lesotho', t:'เลโซโท', l:'ເລໂຊໂທ', k:'africa' },
    { c:'lr', e:'Liberia', t:'ไลบีเรีย', l:'ໄລບີເຣຍ', k:'africa' },
    { c:'ly', e:'Libya', t:'ลิเบีย', l:'ລິເບຍ', k:'africa' },
    { c:'li', e:'Liechtenstein', t:'ลีชเทนสไตน์', l:'ລິກເຕັນສະຕາຍ', k:'europe' },
    { c:'lt', e:'Lithuania', t:'ลิทัวเนีย', l:'ລິທົວເນຍ', k:'europe' },
    { c:'lu', e:'Luxembourg', t:'ลักเซมเบิร์ก', l:'ລຸກຊຳບວກ', k:'europe' },
    { c:'mg', e:'Madagascar', t:'มาดากัสการ์', l:'ມາດາກັສກາ', k:'africa' },
    { c:'mw', e:'Malawi', t:'มาลาวี', l:'ມາລາວີ', k:'africa' },
    { c:'my', e:'Malaysia', t:'มาเลเซีย', l:'ມາເລເຊຍ', k:'asia' },
    { c:'mv', e:'Maldives', t:'มัลดีฟส์', l:'ມັນດີຟ', k:'asia' },
    { c:'ml', e:'Mali', t:'มาลี', l:'ມາລີ', k:'africa' },
    { c:'mt', e:'Malta', t:'มอลตา', l:'ມັນຕາ', k:'europe' },
    { c:'mh', e:'Marshall Islands', t:'หมู่เกาะมาร์แชลล์', l:'ໝູ່ເກາະມາແຊວ', k:'oceania' },
    { c:'mr', e:'Mauritania', t:'มอริเตเนีย', l:'ມໍຣິຕາເນຍ', k:'africa' },
    { c:'mu', e:'Mauritius', t:'มอริเชียส', l:'ມໍຣິຊຽສ', k:'africa' },
    { c:'mx', e:'Mexico', t:'เม็กซิโก', l:'ແມັກຊິໂກ', k:'americas' },
    { c:'fm', e:'Micronesia', t:'ไมโครนีเซีย', l:'ໄມໂກຣເນເຊຍ', k:'oceania' },
    { c:'md', e:'Moldova', t:'มอลโดวา', l:'ມັນໂດວາ', k:'europe' },
    { c:'mc', e:'Monaco', t:'โมนาโก', l:'ໂມນາໂກ', k:'europe' },
    { c:'mn', e:'Mongolia', t:'มองโกเลีย', l:'ມົງໂກເລຍ', k:'asia' },
    { c:'me', e:'Montenegro', t:'มอนเตเนโกร', l:'ມັນເຕເນໂກຣ', k:'europe' },
    { c:'ma', e:'Morocco', t:'โมร็อกโก', l:'ໂມຣັອກໂກ', k:'africa' },
    { c:'mz', e:'Mozambique', t:'โมซัมบิก', l:'ໂມຊຳບິກ', k:'africa' },
    { c:'mm', e:'Myanmar', t:'เมียนมา', l:'ມຽນມາ', k:'asia' },
    { c:'na', e:'Namibia', t:'นามิเบีย', l:'ນາມີເບຍ', k:'africa' },
    { c:'nr', e:'Nauru', t:'นาอูรู', l:'ນາອູຣູ', k:'oceania' },
    { c:'np', e:'Nepal', t:'เนปาล', l:'ເນປານ', k:'asia' },
    { c:'nl', e:'Netherlands', t:'เนเธอร์แลนด์', l:'ເນເທີແລນ', k:'europe' },
    { c:'nz', e:'New Zealand', t:'นิวซีแลนด์', l:'ນິວຊີແລນ', k:'oceania' },
    { c:'ni', e:'Nicaragua', t:'นิการากัว', l:'ນິກາຣາກົວ', k:'americas' },
    { c:'ne', e:'Niger', t:'ไนเจอร์', l:'ໄນເຈີ', k:'africa' },
    { c:'ng', e:'Nigeria', t:'ไนจีเรีย', l:'ໄນຈີເຣຍ', k:'africa' },
    { c:'kp', e:'North Korea', t:'เกาหลีเหนือ', l:'ເກົາຫຼີເໜືອ', k:'asia' },
    { c:'mk', e:'North Macedonia', t:'มาซิโดเนียเหนือ', l:'ມາເຊໂດເນຍເໜືອ', k:'europe' },
    { c:'no', e:'Norway', t:'นอร์เวย์', l:'ນໍເວ', k:'europe' },
    { c:'om', e:'Oman', t:'โอมาน', l:'ໂອມານ', k:'asia' },
    { c:'pk', e:'Pakistan', t:'ปากีสถาน', l:'ປາກິສຖານ', k:'asia' },
    { c:'pw', e:'Palau', t:'ปาเลา', l:'ປາລາວ', k:'oceania' },
    { c:'ps', e:'Palestine', t:'ปาเลสไตน์', l:'ປາແລສຕາຍ', k:'asia' },
    { c:'pa', e:'Panama', t:'ปานามา', l:'ປານາມາ', k:'americas' },
    { c:'pg', e:'Papua New Guinea', t:'ปาปัวนิวกินี', l:'ປາປົວນິວກິເນ', k:'oceania' },
    { c:'py', e:'Paraguay', t:'ปารากวัย', l:'ປາຣາກວາຍ', k:'americas' },
    { c:'pe', e:'Peru', t:'เปรู', l:'ເປຣູ', k:'americas' },
    { c:'ph', e:'Philippines', t:'ฟิลิปปินส์', l:'ຟິລິບປິນ', k:'asia' },
    { c:'pl', e:'Poland', t:'โปแลนด์', l:'ໂປແລນ', k:'europe' },
    { c:'pt', e:'Portugal', t:'โปรตุเกส', l:'ປໍຕຸຍການ', k:'europe' },
    { c:'qa', e:'Qatar', t:'กาตาร์', l:'ກາຕາ', k:'asia' },
    { c:'ro', e:'Romania', t:'โรมาเนีย', l:'ໂຣມາເນຍ', k:'europe' },
    { c:'ru', e:'Russia', t:'รัสเซีย', l:'ຣັດເຊຍ', k:'europe' },
    { c:'rw', e:'Rwanda', t:'รวันดา', l:'ຣວັນດາ', k:'africa' },
    { c:'kn', e:'Saint Kitts and Nevis', t:'เซนต์คิตส์และเนวิส', l:'ແຊງກິດ ແລະ ເນວີສ', k:'americas' },
    { c:'lc', e:'Saint Lucia', t:'เซนต์ลูเซีย', l:'ແຊງລູເຊຍ', k:'americas' },
    { c:'vc', e:'Saint Vincent and the Grenadines', t:'เซนต์วินเซนต์ฯ', l:'ແຊງວິນເຊັນ', k:'americas' },
    { c:'ws', e:'Samoa', t:'ซามัว', l:'ຊາມົວ', k:'oceania' },
    { c:'sm', e:'San Marino', t:'ซานมารีโน', l:'ຊານມາຣິໂນ', k:'europe' },
    { c:'st', e:'Sao Tome and Principe', t:'เซาตูเมและปรินซิปี', l:'ເຊົາຕູເມ ແລະ ປຣິນຊິເປ', k:'africa' },
    { c:'sa', e:'Saudi Arabia', t:'ซาอุดีอาระเบีย', l:'ຊາອຸດີອາລາເບຍ', k:'asia' },
    { c:'sn', e:'Senegal', t:'เซเนกัล', l:'ເຊເນການ', k:'africa' },
    { c:'rs', e:'Serbia', t:'เซอร์เบีย', l:'ເຊີເບຍ', k:'europe' },
    { c:'sc', e:'Seychelles', t:'เซเชลส์', l:'ເຊເຊວ', k:'africa' },
    { c:'sl', e:'Sierra Leone', t:'เซียร์ราลีโอน', l:'ເຊຍຣາລີໂອນ', k:'africa' },
    { c:'sg', e:'Singapore', t:'สิงคโปร์', l:'ສິງກະໂປ', k:'asia' },
    { c:'sk', e:'Slovakia', t:'สโลวาเกีย', l:'ສະໂລວາເກຍ', k:'europe' },
    { c:'si', e:'Slovenia', t:'สโลวีเนีย', l:'ສະໂລເວເນຍ', k:'europe' },
    { c:'sb', e:'Solomon Islands', t:'หมู่เกาะโซโลมอน', l:'ໝູ່ເກາະໂຊໂລມອນ', k:'oceania' },
    { c:'so', e:'Somalia', t:'โซมาเลีย', l:'ໂຊມາລີ', k:'africa' },
    { c:'za', e:'South Africa', t:'แอฟริกาใต้', l:'ອາຟຣິກາໃຕ້', k:'africa' },
    { c:'kr', e:'South Korea', t:'เกาหลีใต้', l:'ເກົາຫຼີໃຕ້', k:'asia' },
    { c:'ss', e:'South Sudan', t:'ซูดานใต้', l:'ຊູດານໃຕ້', k:'africa' },
    { c:'es', e:'Spain', t:'สเปน', l:'ສະເປນ', k:'europe' },
    { c:'lk', e:'Sri Lanka', t:'ศรีลังกา', l:'ສີລັງກາ', k:'asia' },
    { c:'sd', e:'Sudan', t:'ซูดาน', l:'ຊູດານ', k:'africa' },
    { c:'sr', e:'Suriname', t:'ซูรินาเม', l:'ຊູຣິນາມ', k:'americas' },
    { c:'se', e:'Sweden', t:'สวีเดน', l:'ຊູແອັດ', k:'europe' },
    { c:'ch', e:'Switzerland', t:'สวิตเซอร์แลนด์', l:'ສະວິດເຊີແລນ', k:'europe' },
    { c:'sy', e:'Syria', t:'ซีเรีย', l:'ຊີເຣຍ', k:'asia' },
    { c:'tw', e:'Taiwan', t:'ไต้หวัน', l:'ໄຕ້ຫວັນ', k:'asia' },
    { c:'tj', e:'Tajikistan', t:'ทาจิกิสถาน', l:'ທາຈິກິສຖານ', k:'asia' },
    { c:'tz', e:'Tanzania', t:'แทนซาเนีย', l:'ແທນຊາເນຍ', k:'africa' },
    { c:'th', e:'Thailand', t:'ไทย', l:'ໄທ', k:'asia' },
    { c:'tg', e:'Togo', t:'โตโก', l:'ໂຕໂກ', k:'africa' },
    { c:'to', e:'Tonga', t:'ตองงา', l:'ຕົງກາ', k:'oceania' },
    { c:'tt', e:'Trinidad and Tobago', t:'ตรินิแดดและโตเบโก', l:'ຕຣິນິແດດ ແລະ ໂຕບາໂກ', k:'americas' },
    { c:'tn', e:'Tunisia', t:'ตูนิเซีย', l:'ຕູນີຊີ', k:'africa' },
    { c:'tr', e:'Turkey', t:'ตุรกี', l:'ຕຸລະກີ', k:'asia' },
    { c:'tm', e:'Turkmenistan', t:'เติร์กเมนิสถาน', l:'ເທີກເມນິສຖານ', k:'asia' },
    { c:'tv', e:'Tuvalu', t:'ตูวาลู', l:'ຕູວາລູ', k:'oceania' },
    { c:'ug', e:'Uganda', t:'ยูกันดา', l:'ອູການດາ', k:'africa' },
    { c:'ua', e:'Ukraine', t:'ยูเครน', l:'ອູແກຣນ', k:'europe' },
    { c:'ae', e:'United Arab Emirates', t:'สหรัฐอาหรับเอมิเรตส์', l:'ສະຫະອາຫລັບເອມິເຣດ', k:'asia' },
    { c:'gb', e:'United Kingdom', t:'สหราชอาณาจักร', l:'ສະຫະລາຊະອານາຈັກ', k:'europe' },
    { c:'us', e:'United States', t:'สหรัฐอเมริกา', l:'ສະຫະລັດອາເມລິກາ', k:'americas' },
    { c:'uy', e:'Uruguay', t:'อุรุกวัย', l:'ອູຣຸກວາຍ', k:'americas' },
    { c:'uz', e:'Uzbekistan', t:'อุซเบกิสถาน', l:'ອຸສເບກິສຖານ', k:'asia' },
    { c:'vu', e:'Vanuatu', t:'วานูอาตู', l:'ວານົວຕູ', k:'oceania' },
    { c:'va', e:'Vatican City', t:'นครรัฐวาติกัน', l:'ນະຄອນລັດວາຕີກັນ', k:'europe' },
    { c:'ve', e:'Venezuela', t:'เวเนซุเอลา', l:'ເວເນຊູເອລາ', k:'americas' },
    { c:'vn', e:'Vietnam', t:'เวียดนาม', l:'ຫວຽດນາມ', k:'asia' },
    { c:'ye', e:'Yemen', t:'เยเมน', l:'ເຢເມນ', k:'asia' },
    { c:'zm', e:'Zambia', t:'แซมเบีย', l:'ແຊມເບຍ', k:'africa' },
    { c:'zw', e:'Zimbabwe', t:'ซิมบับเว', l:'ຊິມບັບເວ', k:'africa' }
  ];

  function flagUrl(code) { return `https://flagcdn.com/w320/${code}.png`; }

  // ===== UI text per language =====
  const I18N = {
    en: {
      title: '🌍 Flag Game', back: '← Home',
      learn: 'Learn', quiz: 'Quiz',
      score: 'Score', streak: 'Streak', best: 'Best', seen: 'Seen',
      pronounce: 'Pronounce', next: 'Next',
      all: '🌍 All', asia: '🌏 Asia', europe: '🇪🇺 Europe',
      africa: '🌍 Africa', americas: '🌎 Americas', oceania: '🌊 Oceania'
    },
    th: {
      title: '🌍 เกมธง', back: '← หน้าแรก',
      learn: 'เรียนรู้', quiz: 'ทดสอบ',
      score: 'คะแนน', streak: 'ติดต่อ', best: 'ดีที่สุด', seen: 'เห็นแล้ว',
      pronounce: 'ออกเสียง', next: 'ถัดไป',
      all: '🌍 ทั้งหมด', asia: '🌏 เอเชีย', europe: '🇪🇺 ยุโรป',
      africa: '🌍 แอฟริกา', americas: '🌎 อเมริกา', oceania: '🌊 โอเชียเนีย'
    },
    lao: {
      title: '🌍 ເກມທຸງ', back: '← ໜ້າຫຼັກ',
      learn: 'ຮຽນຮູ້', quiz: 'ທົດສອບ',
      score: 'ຄະແນນ', streak: 'ຕໍ່ກັນ', best: 'ດີສຸດ', seen: 'ເຫັນແລ້ວ',
      pronounce: 'ອອກສຽງ', next: 'ຕໍ່ໄປ',
      all: '🌍 ທັງໝົດ', asia: '🌏 ອາຊີ', europe: '🇪🇺 ເອີຣົບ',
      africa: '🌍 ອາຟຣິກາ', americas: '🌎 ອາເມຣິກາ', oceania: '🌊 ໂອເຊເນຍ'
    }
  };

  // ===== Persistent stats =====
  const STATS_KEY = 'flag_stats_v1';
  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return {
        best: s.best || { all:0, asia:0, europe:0, africa:0, americas:0, oceania:0 },
        seen: Array.isArray(s.seen) ? s.seen : []
      };
    } catch { return { best:{}, seen:[] }; }
  }
  function saveStats(patch) {
    const cur = loadStats();
    const updated = Object.assign({}, cur, patch);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
  }

  // ===== State =====
  let lang = (() => {
    const v = localStorage.getItem('lang');
    return (v === 'th' || v === 'en' || v === 'lao') ? v : 'en';
  })();
  let mode = 'learn';                      // 'learn' | 'quiz'
  let continent = 'all';                   // 'all' | 'asia' | ...
  let deck = [];                           // shuffled queue of countries for this filter
  let deckIndex = 0;
  let current = null;                      // current country
  let score = 0;
  let streak = 0;
  let answering = false;                   // lock during answer reveal in quiz

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const elTabs = document.querySelectorAll('.fg-tab');
  const elContinentRow = $('continent-row');
  const elImg = $('flag-img');
  const elName = $('flag-name');
  const elNameEn = $('flag-name-en');
  const elOptions = $('options');
  const elLearnActions = $('learn-actions');
  const elScore = $('ui-score');
  const elStreak = $('ui-streak');
  const elBest = $('ui-best');
  const elSeen = $('ui-seen');
  const elTotal = $('ui-total');
  const elFeedback = $('feedback');

  // ===== Helpers =====
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function nameFor(country, l) {
    if (!country) return '';
    if (l === 'th') return country.t || country.e;
    if (l === 'lao') return country.l || country.e;
    return country.e;
  }
  function filteredCountries() {
    return continent === 'all' ? COUNTRIES : COUNTRIES.filter(c => c.k === continent);
  }

  // ===== Voice (only on user gesture) =====
  function speakCountry(country) {
    if (!country) return;
    const text = country.e; // always pronounce English (TTS coverage)
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try { window.AndroidTTS.speak(text, 'en-US'); return; } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // ===== Build continent chips =====
  function buildContinentRow() {
    const t = I18N[lang];
    const items = [
      { k:'all', label: t.all },
      { k:'asia', label: t.asia },
      { k:'europe', label: t.europe },
      { k:'africa', label: t.africa },
      { k:'americas', label: t.americas },
      { k:'oceania', label: t.oceania }
    ];
    elContinentRow.innerHTML = '';
    for (const it of items) {
      const btn = document.createElement('button');
      btn.className = 'fg-chip' + (continent === it.k ? ' active' : '');
      btn.textContent = it.label;
      btn.dataset.k = it.k;
      btn.addEventListener('click', () => {
        if (continent === it.k) return;
        continent = it.k;
        score = 0; streak = 0;
        startFreshDeck();
        buildContinentRow();
        refreshHud();
        renderRound();
      });
      elContinentRow.appendChild(btn);
    }
  }

  // ===== Deck (shuffled queue so no repeats until cycled) =====
  function startFreshDeck() {
    deck = shuffle(filteredCountries());
    deckIndex = 0;
  }
  function takeNext() {
    if (!deck.length || deckIndex >= deck.length) startFreshDeck();
    return deck[deckIndex++];
  }

  // ===== Render the current round (flag + optional quiz options) =====
  function renderRound() {
    answering = false;
    current = takeNext();
    if (!current) return;
    // Mark as seen
    const stats = loadStats();
    if (!stats.seen.includes(current.c)) {
      stats.seen.push(current.c);
      saveStats({ seen: stats.seen });
    }
    elImg.src = flagUrl(current.c);
    elImg.alt = current.e;
    elFeedback.classList.remove('show');
    elFeedback.textContent = '';

    if (mode === 'learn') {
      // Show name and pronounce/Next actions
      elName.classList.remove('hidden');
      elName.textContent = nameFor(current, lang);
      elNameEn.textContent = lang === 'en' ? '' : current.e;
      elOptions.classList.add('hidden');
      elLearnActions.classList.remove('hidden');
    } else {
      // Quiz: hide name, build 4 options
      elName.classList.add('hidden');
      elNameEn.textContent = '';
      elLearnActions.classList.add('hidden');
      elOptions.classList.remove('hidden');
      buildQuizOptions();
    }
    refreshHud();
  }

  function buildQuizOptions() {
    elOptions.innerHTML = '';
    // 3 wrong options from same filtered pool (or all if not enough)
    const pool = filteredCountries().filter(c => c.c !== current.c);
    const wrong = shuffle(pool).slice(0, 3);
    const all = shuffle([current, ...wrong]);
    for (const opt of all) {
      const btn = document.createElement('button');
      btn.className = 'fg-opt';
      btn.textContent = nameFor(opt, lang);
      btn.dataset.code = opt.c;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      elOptions.appendChild(btn);
    }
  }

  function onAnswer(btn, picked) {
    if (answering) return;
    answering = true;
    const correct = picked.c === current.c;
    // Mark buttons
    [...elOptions.querySelectorAll('.fg-opt')].forEach(b => {
      if (b.dataset.code === current.c) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    // Score + streak
    if (correct) {
      score += 10 + Math.min(20, streak * 2); // streak bonus
      streak++;
      showFeedback('✅');
    } else {
      streak = 0;
      showFeedback('❌');
    }
    // Save best
    const stats = loadStats();
    if (!stats.best[continent] || score > stats.best[continent]) {
      stats.best[continent] = score;
      saveStats({ best: stats.best });
    }
    refreshHud();
    speakCountry(current); // teaching moment: hear correct name
    // Move on
    setTimeout(() => renderRound(), correct ? 700 : 1300);
  }

  function showFeedback(emoji) {
    elFeedback.textContent = emoji;
    // Restart animation
    elFeedback.classList.remove('show');
    void elFeedback.offsetWidth;
    elFeedback.classList.add('show');
  }

  // ===== HUD =====
  function refreshHud() {
    elScore.textContent = score;
    elStreak.textContent = streak;
    const stats = loadStats();
    elBest.textContent = stats.best[continent] || 0;
    const filteredCodes = new Set(filteredCountries().map(c => c.c));
    const seenInFilter = stats.seen.filter(code => filteredCodes.has(code)).length;
    elSeen.textContent = seenInFilter;
    elTotal.textContent = filteredCountries().length;
  }

  // ===== Localization apply =====
  function applyLang() {
    const t = I18N[lang];
    $('hdr-title').textContent = t.title;
    $('hdr-back').textContent = t.back;
    document.querySelector('#tab-learn span').textContent = t.learn;
    document.querySelector('#tab-quiz span').textContent = t.quiz;
    $('lbl-score').textContent = t.score;
    $('lbl-streak').textContent = t.streak;
    $('lbl-best').textContent = t.best;
    $('lbl-seen').textContent = t.seen;
    $('btn-speak-label').textContent = t.pronounce;
    $('btn-next-label').textContent = t.next;
    document.title = t.title + ' · ' + COUNTRIES.length;
    buildContinentRow();
    // Re-render labels on current card
    if (current) {
      if (mode === 'learn') {
        elName.textContent = nameFor(current, lang);
        elNameEn.textContent = lang === 'en' ? '' : current.e;
      } else {
        buildQuizOptions();
      }
    }
    refreshHud();
  }

  // ===== Wiring =====
  elTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (mode === tab.dataset.mode) return;
      mode = tab.dataset.mode;
      elTabs.forEach(t => t.classList.toggle('active', t === tab));
      score = 0; streak = 0;
      startFreshDeck();
      renderRound();
    });
  });

  $('btn-next').addEventListener('click', () => {
    renderRound();
  });
  $('btn-speak').addEventListener('click', () => speakCountry(current));
  elImg.addEventListener('click', () => {
    // In learn mode tapping the flag also pronounces; in quiz it's just decorative
    if (mode === 'learn') speakCountry(current);
  });

  // Keyboard nav (desktop convenience)
  document.addEventListener('keydown', (e) => {
    if (mode === 'learn') {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        renderRound();
      } else if (e.key === 'ArrowDown') {
        speakCountry(current);
      }
    }
  });

  // React to language changes from other tabs / index page
  window.addEventListener('storage', (e) => {
    if (e.key === 'lang') {
      const v = e.newValue;
      if (v === 'th' || v === 'en' || v === 'lao') {
        lang = v;
        applyLang();
      }
    }
  });

  // Init
  startFreshDeck();
  applyLang();
  renderRound();
})();
