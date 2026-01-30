# SyncWatch – Birlikte İzle

Arkadaşlarınla aynı anda video izle. Herhangi bir sitede (YouTube, dizi siteleri vb.) çalışan Chrome uzantısı. Oynat/durdur, ileri-geri sarma ve hız değişimi senkronize çalışır.

---

## Özellikler

- **P2P bağlantı** – Sunucu gerekmez (PeerJS ile WebRTC)
- **Her sitede çalışır** – YouTube, Netflix, dizi/film siteleri, iframe içeren sayfalar
- **Senkronizasyon** – Oynat, durdur, sarma, oynatma hızı birebir aynı
- **Kolay kullanım** – Oda oluştur, kodu paylaş, birlikte izle

---

## Kurulum

### Chrome / Edge

1. Bu projeyi indir veya klonla:
   ```bash
   git clone https://github.com/mericbas/SyncWatch.git
   cd SyncWatch
   ```

2. Tarayıcıda `chrome://extensions` (veya Edge için `edge://extensions`) aç.

3. **Geliştirici modu**nu aç (sağ üstteki anahtar).

4. **Paketlenmemiş öğe yükle** butonuna tıkla.

5. `syncwatch` klasörünü seç.

6. Uzantı araç çubuğunda görünecektir.

---

## Kullanım

### Oda oluşturan (host)

1. İzlemek istediğin video sayfasını aç.
2. SyncWatch ikonuna tıkla.
3. **Oda Oluştur** butonuna bas.
4. Çıkan oda kodunu arkadaşına gönder (kopyala butonu ile).

### Odaya katılan

1. **Aynı** video sayfasını aç (aynı site, aynı bölüm/film).
2. SyncWatch ikonuna tıkla.
3. Oda kodunu yapıştır.
4. **Odaya Katıl** butonuna bas.

### Birlikte izlerken

- Bir tarafta oynat/durdur yapıldığında diğer tarafta da aynı olur.
- İleri/geri sarma senkronize çalışır.
- Oynatma hızı değişince her iki tarafta da güncellenir.
- **Şimdi Senkronize Et** ile anlık konum/hız senkronize edilebilir.

---

## Teknolojiler

- **Chrome Extension (Manifest V3)** – Popup, content script, background
- **PeerJS** – WebRTC tabanlı P2P bağlantı (sunucu maliyeti yok)
- **Vanilla JS** – Ek framework yok

---

## Proje Yapısı

```
syncwatch/
├── manifest.json     # Uzantı tanımı
├── popup.html        # Popup arayüzü
├── popup.css         # Popup stilleri
├── popup.js          # Popup mantığı
├── content.js        # Sayfa/iframe içi video kontrolü
├── background.js     # Arka plan servisi
├── peerjs.min.js     # P2P kütüphanesi
├── icons/            # Uzantı ikonları
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── LICENSE
```

---

## Gereksinimler

- Chrome 88+ veya Edge 88+
- Her iki kullanıcıda da uzantı yüklü olmalı
- Aynı video sayfası açık olmalı (aynı URL veya aynı bölüm)

---

## Lisans

MIT License – detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## Katkıda Bulunma

1. Repo’yu fork et
2. Yeni branch aç (`git checkout -b ozellik/yeni-ozellik`)
3. Değişiklikleri commit et (`git commit -m 'Yeni özellik eklendi'`)
4. Branch’i push et (`git push origin ozellik/yeni-ozellik`)
5. Pull Request aç

---

**SyncWatch** – Birlikte izlemenin kolay yolu.
