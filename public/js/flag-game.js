// รายชื่อประเทศและ path ธง (ใช้ emoji เป็น placeholder, สามารถเปลี่ยนเป็น path รูปจริงได้)
const FLAGS = [
  { name: "Afghanistan", icon: "https://cdn-icons-png.flaticon.com/512/206/206741.png" },
  { name: "Albania", icon: "https://upload.wikimedia.org/wikipedia/commons/3/36/Flag_of_Albania.svg" },
  { name: "Algeria", icon: "https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg" },
  { name: "Andorra", icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Andorra.svg" },
  { name: "Angola", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg" },
  { name: "Antigua and Barbuda", icon: "https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Antigua_and_Barbuda.svg" },
  { name: "Argentina", icon: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg" },
  { name: "Armenia", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Flag_of_Armenia.svg" },
  { name: "Australia", icon: "https://cdn-icons-png.flaticon.com/512/206/206618.png" },
  { name: "Austria", icon: "https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg" },
  { name: "Azerbaijan", icon: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg" },
  { name: "Bahamas", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flag_of_the_Bahamas.svg" },
  { name: "Bahrain", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Bahrain.svg" },
  { name: "Bangladesh", icon: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg" },
  { name: "Barbados", icon: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Flag_of_Barbados.svg" },
  { name: "Belarus", icon: "https://upload.wikimedia.org/wikipedia/commons/8/85/Flag_of_Belarus.svg" },
  { name: "Belgium", icon: "https://cdn-icons-png.flaticon.com/512/555/555625.png" },
  { name: "Belize", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Flag_of_Belize.svg" },
  { name: "Benin", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Benin.svg" },
  { name: "Bhutan", icon: "https://upload.wikimedia.org/wikipedia/commons/9/91/Flag_of_Bhutan.svg" },
  { name: "Bolivia", icon: "https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Bolivia.svg" },
  { name: "Bosnia and Herzegovina", icon: "https://cdn-icons-png.flaticon.com/512/206/206720.png" },
  { name: "Botswana", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_Botswana.svg" },
  { name: "Brazil", icon: "https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg" },
  { name: "Brunei", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Brunei.svg" },
  { name: "Bulgaria", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Bulgaria.svg" },
  { name: "Burkina Faso", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009896.png" },
  { name: "Burundi", icon: "https://upload.wikimedia.org/wikipedia/commons/5/50/Flag_of_Burundi.svg" },
  { name: "Cabo Verde", icon: "https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Cape_Verde.svg" },
  { name: "Cambodia", icon: "https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_Cambodia.svg" },
  { name: "Cameroon", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Flag_of_Cameroon.svg" },
  { name: "Canada", icon: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Canada.svg" },
  { name: "Central African Republic", icon: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Flag_of_the_Central_African_Republic.svg" },
  { name: "Chad", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Flag_of_Chad.svg" },
  { name: "Chile", icon: "https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg" },
  { name: "China", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg" },
  { name: "Colombia", icon: "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg" },
  { name: "Comoros", icon: "https://upload.wikimedia.org/wikipedia/commons/9/94/Flag_of_the_Comoros.svg" },
  { name: "Congo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_the_Republic_of_the_Congo.svg" },
  { name: "Costa Rica", icon: "https://cdn-icons-png.flaticon.com/512/5119/5119159.png" },
  { name: "Croatia", icon: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Croatia.svg" },
  { name: "Cuba", icon: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Flag_of_Cuba.svg" },
  { name: "Cyprus", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Cyprus.svg" },
  { name: "Czech Republic", icon: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_Czech_Republic.svg" },
  { name: "Denmark", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg" },
  { name: "Djibouti", icon: "https://upload.wikimedia.org/wikipedia/commons/3/34/Flag_of_Djibouti.svg" },
  { name: "Dominica", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Flag_of_Dominica.svg" },
  { name: "Dominican Republic", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_the_Dominican_Republic.svg" },
  { name: "Ecuador", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg" },
  { name: "Egypt", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Egypt.svg" },
  { name: "El Salvador", icon: "https://cdn-icons-png.flaticon.com/512/14010/14010015.png" },
  { name: "Equatorial Guinea", icon: "https://cdn-icons-png.flaticon.com/512/330/330496.png" },
  { name: "Eritrea", icon: "https://upload.wikimedia.org/wikipedia/commons/2/29/Flag_of_Eritrea.svg" },
  { name: "Estonia", icon: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Flag_of_Estonia.svg" },
  { name: "Eswatini", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Flag_of_Eswatini.svg" },
  { name: "Ethiopia", icon: "https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_Ethiopia.svg" },
  { name: "Fiji", icon: "https://cdn-icons-png.flaticon.com/512/206/206715.png" },
  { name: "Finland", icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Finland.svg" },
  { name: "France", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg" },
  { name: "Gabon", icon: "https://upload.wikimedia.org/wikipedia/commons/0/04/Flag_of_Gabon.svg" },
  { name: "Gambia", icon: "https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_The_Gambia.svg" },
  { name: "Georgia", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Georgia.svg" },
  { name: "Germany", icon: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg" },
  { name: "Ghana", icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg" },
  { name: "Greece", icon: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg" },
  { name: "Grenada", icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Grenada.svg" },
  { name: "Guatemala", icon: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Flag_of_Guatemala.svg" },
  { name: "Guinea", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009672.png" },
  { name: "Guinea-Bissau", icon: "https://cdn-icons-png.flaticon.com/512/14010/14010001.png" },
  { name: "Guyana", icon: "https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_Guyana.svg" },
  { name: "Haiti", icon: "https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Haiti.svg" },
  { name: "Honduras", icon: "https://cdn-icons-png.flaticon.com/512/206/206828.png" },
  { name: "Hungary", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Flag_of_Hungary.svg" },
  { name: "Iceland", icon: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Iceland.svg" },
  { name: "India", icon: "https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_India.svg" },
  { name: "Indonesia", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Indonesia.svg" },
  { name: "Iran", icon: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Flag_of_Iran.svg" },
  { name: "Iraq", icon: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Iraq.svg" },
  { name: "Ireland", icon: "https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg" },
  { name: "Israel", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Israel.svg" },
  { name: "Italy", icon: "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg" },
  { name: "Jamaica", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Jamaica.svg" },
  { name: "Japan", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg" },
  { name: "Jordan", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Flag_of_Jordan.svg" },
  { name: "Kazakhstan", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Kazakhstan.svg" },
  { name: "Kenya", icon: "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg" },
  { name: "Kiribati", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Kiribati.svg" },
  { name: "Kuwait", icon: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Flag_of_Kuwait.svg" },
  { name: "Kyrgyzstan", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Flag_of_Kyrgyzstan.svg" },
  { name: "Laos", icon: "https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Laos.svg" },
  { name: "Latvia", icon: "https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Latvia.svg" },
  { name: "Lebanon", icon: "https://upload.wikimedia.org/wikipedia/commons/5/59/Flag_of_Lebanon.svg" },
  { name: "Lesotho", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Flag_of_Lesotho.svg" },
  { name: "Liberia", icon: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Flag_of_Liberia.svg" },
  { name: "Libya", icon: "https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Libya.svg" },
  { name: "Liechtenstein", icon: "https://upload.wikimedia.org/wikipedia/commons/4/47/Flag_of_Liechtenstein.svg" },
  { name: "Lithuania", icon: "https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Lithuania.svg" },
  { name: "Luxembourg", icon: "https://upload.wikimedia.org/wikipedia/commons/d/da/Flag_of_Luxembourg.svg" },
  { name: "Madagascar", icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Madagascar.svg" },
  { name: "Malawi", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Flag_of_Malawi.svg" },
  { name: "Malaysia", icon: "https://upload.wikimedia.org/wikipedia/commons/6/66/Flag_of_Malaysia.svg" },
  { name: "Maldives", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Maldives.svg" },
  { name: "Mali", icon: "https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Mali.svg" },
  { name: "Malta", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009729.png" },
  { name: "Marshall Islands", icon: "https://cdn-icons-png.flaticon.com/512/206/206749.png" },
  { name: "Mauritania", icon: "https://upload.wikimedia.org/wikipedia/commons/4/43/Flag_of_Mauritania.svg" },
  { name: "Mauritius", icon: "https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Mauritius.svg" },
  { name: "Mexico", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg" },
  { name: "Micronesia", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009979.png" },
  { name: "Moldova", icon: "https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Moldova.svg" },
  { name: "Monaco", icon: "https://cdn-icons-png.flaticon.com/512/555/555636.png" },
  { name: "Mongolia", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Mongolia.svg" },
  { name: "Montenegro", icon: "https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Montenegro.svg" },
  { name: "Morocco", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg" },
  { name: "Mozambique", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Flag_of_Mozambique.svg" },
  { name: "Myanmar", icon: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_Myanmar.svg" },
  { name: "Namibia", icon: "https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Namibia.svg" },
  { name: "Nauru", icon: "https://upload.wikimedia.org/wikipedia/commons/3/30/Flag_of_Nauru.svg" },
  { name: "Nepal", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg" },
  { name: "Netherlands", icon: "https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg" },
  { name: "New Zealand", icon: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg" },
  { name: "Nicaragua", icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Nicaragua.svg" },
  { name: "Niger", icon: "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flag_of_Niger.svg" },
  { name: "Nigeria", icon: "https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg" },
  { name: "North Korea", icon: "https://upload.wikimedia.org/wikipedia/commons/5/51/Flag_of_North_Korea.svg" },
  { name: "North Macedonia", icon: "https://cdn-icons-png.flaticon.com/512/8603/8603388.png" },
  { name: "Norway", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg" },
  { name: "Oman", icon: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg" },
  { name: "Pakistan", icon: "https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg" },
  { name: "Palau", icon: "https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Palau.svg" },
  { name: "Palestine", icon: "https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Palestine.svg" },
  { name: "Panama", icon: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Flag_of_Panama.svg" },
  { name: "Papua New Guinea", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Flag_of_Papua_New_Guinea.svg" },
  { name: "Paraguay", icon: "https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg" },
  { name: "Peru", icon: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg" },
  { name: "Philippines", icon: "https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_the_Philippines.svg" },
  { name: "Poland", icon: "https://upload.wikimedia.org/wikipedia/commons/1/12/Flag_of_Poland.svg" },
  { name: "Portugal", icon: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg" },
  { name: "Qatar", icon: "https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg" },
  { name: "Romania", icon: "https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Romania.svg" },
  { name: "Russia", icon: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg" },
  { name: "Rwanda", icon: "https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Rwanda.svg" },
  { name: "Saint Kitts and Nevis", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009772.png" },
  { name: "Saint Lucia", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Saint_Lucia.svg" },
  { name: "Saint Vincent and the Grenadines", icon: "https://cdn-icons-png.flaticon.com/512/5327/5327376.png" },
  { name: "Samoa", icon: "https://cdn-icons-png.flaticon.com/512/555/555431.png" },
  { name: "San Marino", icon: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Flag_of_San_Marino.svg" },
  { name: "Sao Tome and Principe", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009776.png" },
  { name: "Saudi Arabia", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg" },
  { name: "Senegal", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg" },
  { name: "Serbia", icon: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg" },
  { name: "Seychelles", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Seychelles.svg" },
  { name: "Sierra Leone", icon: "https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Sierra_Leone.svg" },
  { name: "Singapore", icon: "https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Singapore.svg" },
  { name: "Slovakia", icon: "https://cdn-icons-png.flaticon.com/512/555/555634.png" },
  { name: "Slovenia", icon: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Flag_of_Slovenia.svg" },
  { name: "Solomon Islands", icon: "https://upload.wikimedia.org/wikipedia/commons/7/74/Flag_of_the_Solomon_Islands.svg" },
  { name: "Somalia", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_Somalia.svg" },
  { name: "South Africa", icon: "https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg" },
  { name: "South Korea", icon: "https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg" },
  { name: "South Sudan", icon: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Flag_of_South_Sudan.svg" },
  { name: "Spain", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg" },
  { name: "Sri Lanka", icon: "https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg" },
  { name: "Sudan", icon: "https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_Sudan.svg" },
  { name: "Suriname", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009808.png" },
  { name: "Sweden", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Sweden.svg" },
  { name: "Switzerland", icon: "https://cdn-icons-png.flaticon.com/512/555/555582.png" },
  { name: "Syria", icon: "https://cdn-icons-png.flaticon.com/512/555/555640.png" },
  { name: "Taiwan", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009816.png" },
  { name: "Tajikistan", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Flag_of_Tajikistan.svg" },
  { name: "Tanzania", icon: "https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tanzania.svg" },
  { name: "Thailand", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg" },
  { name: "Togo", icon: "https://upload.wikimedia.org/wikipedia/commons/6/68/Flag_of_Togo.svg" },
  { name: "Tonga", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Tonga.svg" },
  { name: "Trinidad and Tobago", icon: "https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Trinidad_and_Tobago.svg" },
  { name: "Tunisia", icon: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg" },
  { name: "Turkey", icon: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg" },
  { name: "Turkmenistan", icon: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Turkmenistan.svg" },
  { name: "Tuvalu", icon: "https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tuvalu.svg" },
  { name: "Uganda", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Flag_of_Uganda.svg" },
  { name: "Ukraine", icon: "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg" },
  { name: "United Arab Emirates", icon: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg" },
  { name: "United Kingdom", icon: "https://cdn-icons-png.flaticon.com/512/5111/5111640.png" },
  { name: "United States", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg" },
  { name: "Uruguay", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Uruguay.svg" },
  { name: "Uzbekistan", icon: "https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg" },
  { name: "Vanuatu", icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Vanuatu.svg" },
  { name: "Vatican City", icon: "https://cdn-icons-png.flaticon.com/512/14009/14009924.png" },
  { name: "Venezuela", icon: "https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Venezuela.svg" },
  { name: "Vietnam", icon: "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" },
  { name: "Yemen", icon: "https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Yemen.svg" },
  { name: "Zambia", icon: "https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Zambia.svg" },
  { name: "Zimbabwe", icon: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Flag_of_Zimbabwe.svg" }
];


function speakCountry(name) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(name);
    utter.lang = 'en-US';
    utter.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

let currentFlagIndex = 0;
function getRandomFlagIndex() {
  return Math.floor(Math.random() * FLAGS.length);
}

function renderSingleFlag() {
  const container = document.getElementById('flag-single');
  container.innerHTML = '';
  const flag = FLAGS[currentFlagIndex];
  const item = document.createElement('div');
  item.className = 'flag-item';
  item.style.background = '#fff';
  item.style.borderRadius = '18px';
  item.style.boxShadow = '0 2px 16px rgba(25,118,210,0.18)';
  item.style.padding = '2.5rem 2rem';
  item.style.display = 'flex';
  item.style.flexDirection = 'column';
  item.style.alignItems = 'center';
  item.style.marginBottom = '1.5rem';
  item.onclick = () => speakCountry(flag.name);
  const icon = document.createElement('img');
  icon.className = 'flag-icon';
  icon.src = flag.icon;
  icon.alt = flag.name + ' flag';
  icon.style.width = '180px';
  icon.style.height = '120px';
  icon.style.objectFit = 'contain';
  icon.style.marginBottom = '1.2rem';
  icon.style.borderRadius = '8px';
  icon.style.border = '2px solid #1976d2';
  item.appendChild(icon);
  const name = document.createElement('div');
  name.className = 'flag-name';
  name.textContent = flag.name;
  name.style.fontSize = '2.2rem';
  name.style.color = '#1976d2';
  name.style.fontWeight = 'bold';
  name.style.textAlign = 'center';
  name.style.letterSpacing = '1px';
  item.appendChild(name);
  container.appendChild(item);
}

window.onload = () => {
  currentFlagIndex = getRandomFlagIndex();
  renderSingleFlag();
  speakCountry(FLAGS[currentFlagIndex].name);
  document.getElementById('nextFlagBtn').onclick = () => {
    let nextIndex;
    do {
      nextIndex = getRandomFlagIndex();
    } while (nextIndex === currentFlagIndex && FLAGS.length > 1);
    currentFlagIndex = nextIndex;
    renderSingleFlag();
    speakCountry(FLAGS[currentFlagIndex].name);
  };
};
