# Animal Sounds (Optional)

วางไฟล์ MP3 ของเสียงสัตว์จริงในโฟลเดอร์นี้เพื่อใช้ในเกม sound-game.html

## ชื่อไฟล์ที่ระบบมองหา (case-sensitive)

```
cat.mp3        🐱  เสียงแมวร้อง (meow)
dog.mp3        🐶  เสียงหมาเห่า (bark)
cow.mp3        🐮  เสียงวัวร้อง (moo)
duck.mp3       🦆  เสียงเป็ดร้อง (quack)
chicken.mp3    🐔  เสียงไก่ขัน (cluck/crow)
elephant.mp3   🐘  เสียงช้างร้อง (trumpet)
horse.mp3      🐴  เสียงม้าร้อง (neigh)
sheep.mp3      🐑  เสียงแกะร้อง (bleat)
pig.mp3        🐷  เสียงหมูร้อง (oink)
bird.mp3       🐦  เสียงนกร้อง (tweet)
frog.mp3       🐸  เสียงกบ (ribbit)
lion.mp3       🦁  เสียงสิงโตคำราม (roar)
wolf.mp3       🐺  เสียงหมาป่าหอน (howl)
bee.mp3        🐝  เสียงผึ้งบิน (buzz)
```

## แหล่ง MP3 ฟรี

- **Pixabay.com/sound-effects** — CC0 ไม่ต้องอ้างอิงผู้สร้าง
- **Mixkit.co/free-sound-effects/animals** — Free for commercial use
- **Freesound.org** — สมัครฟรี, license หลากหลาย (ตรวจก่อนใช้)
- **Wikimedia Commons** — Public domain audio (e.g., search "cat meow ogg")

ดาวน์โหลด → rename เป็นชื่อตามตาราง → ลากใส่โฟลเดอร์นี้ → รีโหลดเกม → ฟัง.

## ถ้าไม่มีไฟล์

เกมจะ fall back ไปใช้ **TTS** อ่านคำเลียนเสียงสัตว์ ("Meow!", "Woof!") พร้อมปรับ pitch/rate ให้ฟังแตกต่างกัน. ทำงานได้แต่ไม่เหมือนเสียงจริง.

แนะนำ MP3 ความยาว 1-2 วินาที (ไม่ยาวเกิน 3s) เพื่อ UX ที่ดี.
