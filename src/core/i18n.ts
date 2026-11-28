// Localisation. Source strings in the code are Ukrainian; a MutationObserver translates every text node
// (and aria-label/title/placeholder) as it appears, so games need no code changes. {0},{1} are placeholders.
// Line format: uk | en | ru | es | pt | de | fr | tr | pl   (empty → falls back to English)
import { store } from './store';

export const LANGS = [
  ['en', 'English'], ['uk', 'Українська'], ['ru', 'Русский'], ['es', 'Español'], ['pt', 'Português'],
  ['de', 'Deutsch'], ['fr', 'Français'], ['tr', 'Türkçe'], ['pl', 'Polski'],
] as const;
const ORDER = ['uk', 'en', 'ru', 'es', 'pt', 'de', 'fr', 'tr', 'pl'];

const TABLE = `
Пауза|Pause|Пауза|Pausa|Pausa|Pause|Pause|Duraklat|Pauza
Добре!|Good!|Хорошо!|¡Bien!|Boa!|Gut!|Bien !|İyi!|Dobrze!
Чудово!|Great!|Отлично!|¡Genial!|Ótimo!|Super!|Super !|Harika!|Świetnie!
Так тримати!|Keep it up!|Так держать!|¡Sigue así!|Continue assim!|Weiter so!|Continue !|Böyle devam!|Tak trzymaj!
Неймовірно!|Unstoppable!|Невероятно!|¡Imparable!|Imparável!|Unaufhaltsam!|Inarrêtable !|Durdurulamaz!|Niesamowite!
Новий рекорд!|New high score!|Новый рекорд!|¡Nuevo récord!|Novo recorde!|Neuer Rekord!|Nouveau record !|Yeni rekor!|Nowy rekord!
За цей захід|This round|За этот заход|Esta ronda|Esta rodada|Diese Runde|Cette manche|Bu tur|Ta runda
Рекорд|High score|Рекорд|Récord|Recorde|Rekord|Record|Rekor|Rekord
Налаштування|Settings|Настройки|Ajustes|Configurações|Einstellungen|Réglages|Ayarlar|Ustawienia
Звук|Sound|Звук|Sonido|Som|Ton|Son|Ses|Dźwięk
Вібрація|Vibration|Вибрация|Vibración|Vibração|Vibration|Vibration|Titreşim|Wibracje
Підсвітка доступних|Highlight free tiles|Подсветка доступных|Resaltar fichas libres|Destacar peças livres|Freie Steine hervorheben|Surligner les tuiles libres|Serbest taşları vurgula|Podświetl wolne kafelki
Закрити|Close|Закрыть|Cerrar|Fechar|Schließen|Fermer|Kapat|Zamknij
Підказка|Hint|Подсказка|Pista|Dica|Tipp|Indice|İpucu|Podpowiedź
Повернути|Undo|Вернуть|Deshacer|Desfazer|Rückgängig|Annuler|Geri al|Cofnij
Закінчилось. Отримай ще:|None left. Get more:|Закончилось. Получи ещё:|No te quedan. Consigue más:|Acabou. Ganhe mais:|Aufgebraucht. Hol dir mehr:|Épuisé. Obtiens-en plus :|Kalmadı. Daha fazla al:|Skończyło się. Zdobądź więcej:
Реклама: +1|Watch ad: +1|Реклама: +1|Anuncio: +1|Anúncio: +1|Werbung: +1|Pub : +1|Reklam: +1|Reklama: +1
3 шт. за {0} 💎|3 for {0} 💎|3 шт. за {0} 💎|3 por {0} 💎|3 por {0} 💎|3 für {0} 💎|3 pour {0} 💎|{0} 💎 karşılığı 3 adet|3 szt. za {0} 💎
У тебе {0} 💎|You have {0} 💎|У тебя {0} 💎|Tienes {0} 💎|Você tem {0} 💎|Du hast {0} 💎|Tu as {0} 💎|{0} 💎 var|Masz {0} 💎
Досягнення: рівень {0}|Achievement: level {0}|Достижение: уровень {0}|Logro: nivel {0}|Conquista: nível {0}|Erfolg: Level {0}|Succès : niveau {0}|Başarı: seviye {0}|Osiągnięcie: poziom {0}
Кристали|Crystals|Кристаллы|Cristales|Cristais|Kristalle|Cristaux|Kristaller|Kryształy
Кристали дають підказки, перемішування та інші бонуси в іграх.|Crystals buy hints, shuffles and other in-game boosts.|Кристаллы дают подсказки, перемешивания и другие бонусы в играх.|Los cristales dan pistas, mezclas y otros bonus.|Cristais dão dicas, embaralhamentos e outros bônus.|Kristalle bringen Tipps, Mischen und andere Boni.|Les cristaux offrent indices, mélanges et autres bonus.|Kristallerle ipucu, karıştırma ve diğer bonusları al.|Kryształy dają podpowiedzi, tasowanie i inne bonusy.
Реклама: +10 💎 ({0} сьогодні)|Watch ad: +10 💎 ({0} left today)|Реклама: +10 💎 ({0} сегодня)|Anuncio: +10 💎 ({0} hoy)|Anúncio: +10 💎 ({0} hoje)|Werbung: +10 💎 ({0} heute)|Pub : +10 💎 ({0} aujourd'hui)|Reklam: +10 💎 (bugün {0})|Reklama: +10 💎 ({0} dziś)
Демо: оплата ще не підключена, кристали нараховуються безкоштовно.|Demo: payments are not connected yet, crystals are free.|Демо: оплата ещё не подключена, кристаллы начисляются бесплатно.|Demo: los pagos aún no están conectados, los cristales son gratis.|Demo: pagamentos ainda não conectados, cristais grátis.|Demo: Zahlungen noch nicht verbunden, Kristalle gratis.|Démo : paiements pas encore connectés, cristaux gratuits.|Demo: ödeme henüz bağlı değil, kristaller ücretsiz.|Demo: płatności jeszcze niepodłączone, kryształy za darmo.
Реклама|Ad|Реклама|Anuncio|Anúncio|Werbung|Pub|Reklam|Reklama
Покупка (демо)|Purchase (demo)|Покупка (демо)|Compra (demo)|Compra (demo)|Kauf (Demo)|Achat (démo)|Satın alma (demo)|Zakup (demo)
Повідомити про помилку|Report a bug|Сообщить об ошибке|Informar de un error|Relatar um erro|Fehler melden|Signaler un bug|Hata bildir|Zgłoś błąd
Додати скріншот|Attach screenshot|Добавить скриншот|Adjuntar captura|Anexar captura|Screenshot anhängen|Joindre une capture|Ekran görüntüsü ekle|Dołącz zrzut ekranu
Що сталося? Що ти робив перед цим?|What happened? What did you do just before?|Что случилось? Что ты делал перед этим?|¿Qué pasó? ¿Qué hiciste justo antes?|O que aconteceu? O que você fez antes?|Was ist passiert? Was hast du davor gemacht?|Que s'est-il passé ? Qu'as-tu fait juste avant ?|Ne oldu? Hemen önce ne yaptın?|Co się stało? Co robiłeś tuż przed tym?
Надіслати|Send|Отправить|Enviar|Enviar|Senden|Envoyer|Gönder|Wyślij
Дякуємо! Звіт надіслано|Thanks! Report sent|Спасибо! Отчёт отправлен|¡Gracias! Informe enviado|Obrigado! Relatório enviado|Danke! Bericht gesendet|Merci ! Rapport envoyé|Teşekkürler! Rapor gönderildi|Dzięki! Zgłoszenie wysłane
Конфіденційність|Privacy|Конфиденциальность|Privacidad|Privacidade|Datenschutz|Confidentialité|Gizlilik|Prywatność
Ми зберігаємо прогрес і налаштування на твоєму пристрої та анонімний акаунт для рейтингу. Рекламні партнери можуть використовувати cookies, щоб показувати рекламу.|We keep your progress and settings on your device and an anonymous account for the leaderboards. Ad partners may use cookies to show ads.|Мы храним прогресс и настройки на твоём устройстве и анонимный аккаунт для рейтинга. Рекламные партнёры могут использовать cookies для показа рекламы.|Guardamos tu progreso y ajustes en tu dispositivo y una cuenta anónima para las clasificaciones. Los socios publicitarios pueden usar cookies para mostrar anuncios.|Guardamos seu progresso e configurações no dispositivo e uma conta anônima para os rankings. Parceiros de anúncios podem usar cookies para exibir anúncios.|Wir speichern Fortschritt und Einstellungen auf deinem Gerät und ein anonymes Konto für die Bestenlisten. Werbepartner können Cookies für Anzeigen nutzen.|Nous gardons ta progression et tes réglages sur ton appareil et un compte anonyme pour les classements. Nos partenaires publicitaires peuvent utiliser des cookies.|İlerlemeni ve ayarlarını cihazında, sıralama için anonim bir hesapta tutarız. Reklam ortakları reklam göstermek için çerez kullanabilir.|Przechowujemy postęp i ustawienia na twoim urządzeniu oraz anonimowe konto do rankingu. Partnerzy reklamowi mogą używać plików cookie.
Політика конфіденційності|Privacy policy|Политика конфиденциальности|Política de privacidad|Política de privacidade|Datenschutzerklärung|Politique de confidentialité|Gizlilik politikası|Polityka prywatności
Прийняти все|Accept all|Принять все|Aceptar todo|Aceitar tudo|Alle akzeptieren|Tout accepter|Tümünü kabul et|Akceptuj wszystko
Лише необхідні|Only necessary|Только необходимые|Solo necesarias|Somente necessários|Nur notwendige|Uniquement nécessaires|Yalnızca gerekli|Tylko niezbędne
Дивись на числа, а не лише на колір воріт: іноді вигідні ворота червоні. Обходь пастки.|Read the numbers, not just the gate colour: sometimes the good gate is red. Dodge the traps.|Смотри на числа, а не только на цвет ворот: иногда выгодные ворота красные. Обходи ловушки.|Mira los números, no solo el color: a veces la puerta buena es roja. Esquiva las trampas.|Olhe os números, não só a cor: às vezes o portão bom é vermelho. Desvie das armadilhas.|Lies die Zahlen, nicht nur die Farbe: Manchmal ist das gute Tor rot. Weiche Fallen aus.|Lis les nombres, pas seulement la couleur : parfois la bonne porte est rouge. Évite les pièges.|Sadece renge değil sayılara bak: bazen iyi kapı kırmızıdır. Tuzaklardan kaç.|Patrz na liczby, nie tylko na kolor: czasem dobra brama jest czerwona. Omijaj pułapki.
ліворуч зброя, посередині зомбі, праворуч підкріплення|left: weapons, middle: zombies, right: reinforcements|слева оружие, посередине зомби, справа подкрепление|izquierda: armas, centro: zombis, derecha: refuerzos|esquerda: armas, meio: zumbis, direita: reforços|links Waffen, Mitte Zombies, rechts Verstärkung|à gauche les armes, au milieu les zombies, à droite les renforts|solda silahlar, ortada zombiler, sağda takviye|po lewej broń, w środku zombie, po prawej posiłki
Швидкострільність|Rapid fire|Скорострельность|Disparo rápido|Tiro rápido|Schnellfeuer|Tir rapide|Hızlı ateş|Szybki ogień
Подвійна шкода|Double damage|Двойной урон|Doble daño|Dano duplo|Doppelter Schaden|Dégâts doublés|Çift hasar|Podwójne obrażenia
Заморозка|Freeze|Заморозка|Congelación|Congelar|Frost|Gel|Dondurma|Zamrożenie
Бомба|Bomb|Бомба|Bomba|Bomba|Bombe|Bombe|Bomba|Bomba
+1 серце|+1 heart|+1 сердце|+1 corazón|+1 coração|+1 Herz|+1 cœur|+1 kalp|+1 serce
−{0} бійців|−{0} soldiers|−{0} бойцов|−{0} soldados|−{0} soldados|−{0} Soldaten|−{0} soldats|−{0} asker|−{0} żołnierzy
{0} ігор|{0} games|{0} игр|{0} juegos|{0} jogos|{0} Spiele|{0} jeux|{0} oyun|{0} gier
Без реклами|No ads|Без рекламы|Sin anuncios|Sem anúncios|Werbefrei|Sans pub|Reklamsız|Bez reklam
Головоломки на хвилинку. Без реєстрації, прогрес зберігається.|Bite-sized puzzles. No sign-up, progress is saved.|Головоломки на минутку. Без регистрации, прогресс сохраняется.|Puzzles rápidos. Sin registro, tu progreso se guarda.|Quebra-cabeças rápidos. Sem cadastro, o progresso é salvo.|Rätsel für zwischendurch. Ohne Anmeldung, Fortschritt wird gespeichert.|Des casse-têtes express. Sans inscription, ta progression est sauvegardée.|Kısa bulmacalar. Kayıt yok, ilerleme kaydedilir.|Szybkie łamigłówki. Bez rejestracji, postęp się zapisuje.
Продовжити|Continue|Продолжить|Continuar|Continuar|Weiter|Continuer|Devam et|Kontynuuj
Усі ігри|All games|Все игры|Todos los juegos|Todos os jogos|Alle Spiele|Tous les jeux|Tüm oyunlar|Wszystkie gry
Скоро|Soon|Скоро|Pronto|Em breve|Bald|Bientôt|Yakında|Wkrótce
Грати|Play|Играть|Jugar|Jogar|Spielen|Jouer|Oyna|Graj
Парковка|Parking Jam|Парковка|Aparcamiento|Estacionamento|Parkplatz|Parking|Otopark|Parking
Виведи всі машини|Get every car out|Выведи все машины|Saca todos los coches|Tire todos os carros|Hol alle Autos raus|Fais sortir toutes les voitures|Tüm arabaları çıkar|Wyprowadź wszystkie auta
Блоки|Blocks|Блоки|Bloques|Blocos|Blöcke|Blocs|Bloklar|Klocki
Заповнюй ряди|Fill the rows|Заполняй ряды|Llena las filas|Complete as linhas|Fülle die Reihen|Remplis les lignes|Sıraları doldur|Wypełniaj rzędy
Маджонг|Mahjong|Маджонг|Mahjong|Mahjong|Mahjong|Mahjong|Mahjong|Mahjong
Знайди пари|Find the pairs|Найди пары|Encuentra parejas|Encontre os pares|Finde Paare|Trouve les paires|Çiftleri bul|Znajdź pary
Монети|Coins|Монеты|Monedas|Moedas|Münzen|Pièces|Paralar|Monety
Сортуй і зливай|Sort and merge|Сортируй и объединяй|Ordena y fusiona|Separe e junte|Sortieren und verschmelzen|Trie et fusionne|Sırala ve birleştir|Sortuj i łącz
Котоку|Catdoku|Котоку|Gatoku|Gatoku|Katzoku|Chatdoku|Kedoku|Kotoku
Один кіт на зону|One cat per zone|Один кот на зону|Un gato por zona|Um gato por zona|Eine Katze pro Zone|Un chat par zone|Her bölgeye bir kedi|Jeden kot na strefę
Автобуси|Bus Jam|Автобусы|Autobuses|Ônibus|Busse|Bus|Otobüsler|Autobusy
Розсади пасажирів|Seat the passengers|Рассади пассажиров|Sienta a los pasajeros|Embarque os passageiros|Setz die Fahrgäste|Installe les passagers|Yolcuları oturt|Usadź pasażerów
Знайди кота|Find the Cat|Найди кота|Encuentra al gato|Ache o gato|Finde die Katze|Trouve le chat|Kediyi bul|Znajdź kota
Пошук на малюнку|Hidden object|Поиск на картинке|Objetos ocultos|Objetos escondidos|Wimmelbild|Objets cachés|Gizli nesne|Szukaj na obrazku
Оборона|Gate Defense|Оборона|Defensa|Defesa|Verteidigung|Défense|Savunma|Obrona
Стріляй і качай зброю|Shoot and upgrade guns|Стреляй и качай оружие|Dispara y mejora armas|Atire e melhore armas|Schieß und rüste auf|Tire et améliore tes armes|Ateş et, silahı geliştir|Strzelaj i ulepszaj broń
Натовп|Crowd Run|Толпа|Multitud|Multidão|Menge|Foule|Kalabalık|Tłum
Обирай ворота, бий зомбі|Pick gates, beat zombies|Выбирай ворота, бей зомби|Elige puertas, vence zombis|Escolha portões, vença zumbis|Wähle Tore, besiege Zombies|Choisis les portes, bats les zombies|Kapıyı seç, zombileri yen|Wybieraj bramy, pokonuj zombie
Куб-стрілки|Arrow Cube|Куб-стрелки|Cubo de flechas|Cubo de setas|Pfeilwürfel|Cube fléché|Ok küpü|Kostka strzałek
Розбери 3D-куб|Take the 3D cube apart|Разбери 3D-куб|Desarma el cubo 3D|Desmonte o cubo 3D|Zerlege den 3D-Würfel|Démonte le cube 3D|3D küpü sök|Rozbierz kostkę 3D
Пікс-змійки|Pixel Snakes|Пикс-змейки|Serpientes píxel|Cobras pixel|Pixel-Schlangen|Serpents pixel|Piksel yılanlar|Pikselowe węże
Колір до кольору|Colour to colour|Цвет к цвету|Color con color|Cor com cor|Farbe zu Farbe|Couleur sur couleur|Renk renge|Kolor do koloru
Сани|Sled Run|Сани|Trineo|Trenó|Schlitten|Luge|Kızak|Sanki
Нескінченний спуск|Endless downhill|Бесконечный спуск|Descenso infinito|Descida sem fim|Endlose Abfahrt|Descente sans fin|Sonsuz iniş|Niekończący się zjazd
Гавань|Harbor|Гавань|Puerto|Porto|Hafen|Port|Liman|Przystań
Мердж з історією|Merge with a story|Мердж с историей|Fusiona con historia|Fusão com história|Merge mit Geschichte|Fusion avec histoire|Hikayeli birleştirme|Łączenie z historią
Рівень {0}|Level {0}|Уровень {0}|Nivel {0}|Nível {0}|Level {0}|Niveau {0}|Seviye {0}|Poziom {0}
Рекорд {0}|Best {0}|Рекорд {0}|Récord {0}|Recorde {0}|Rekord {0}|Record {0}|Rekor {0}|Rekord {0}
Розділ {0}|Chapter {0}|Глава {0}|Capítulo {0}|Capítulo {0}|Kapitel {0}|Chapitre {0}|Bölüm {0}|Rozdział {0}
Рів. {0}|Lv. {0}|Ур. {0}|Niv. {0}|Nív. {0}|Lv. {0}|Niv. {0}|Sv. {0}|Poz. {0}
Тут буде банер 320×50|Banner 320×50 goes here|Здесь будет баннер 320×50|Aquí irá un banner 320×50|Aqui vai um banner 320×50|Hier kommt ein 320×50-Banner|Bannière 320×50 ici|Buraya 320×50 banner gelecek|Tu będzie baner 320×50
Прибрати|Remove|Убрать|Quitar|Remover|Entfernen|Retirer|Kaldır|Usuń
Міжрівнева реклама|Ad break|Реклама между уровнями|Pausa publicitaria|Intervalo comercial|Werbepause|Pause pub|Reklam arası|Przerwa reklamowa
Реклама за нагороду|Rewarded ad|Реклама за награду|Anuncio con premio|Anúncio premiado|Belohnungswerbung|Pub récompensée|Ödüllü reklam|Reklama z nagrodą
Тут буде {0}.|{0} goes here.|Здесь будет {0}.|Aquí irá {0}.|Aqui vai {0}.|Hier kommt {0}.|{0} ici.|Buraya {0} gelecek.|Tu będzie {0}.
Назавжди прибирає банер і міжрівневу рекламу. Реклама за бонуси лишається, тільки за бажанням.|Removes the banner and ad breaks forever. Ads for bonuses stay, only if you want them.|Навсегда убирает баннер и рекламу между уровнями. Реклама за бонусы остаётся, только по желанию.|Quita para siempre el banner y las pausas. Los anuncios por premios siguen, solo si quieres.|Remove para sempre o banner e os intervalos. Anúncios por bônus continuam, só se você quiser.|Entfernt Banner und Werbepausen für immer. Werbung für Boni bleibt freiwillig.|Supprime pour toujours la bannière et les pauses. Les pubs à bonus restent, au choix.|Banner ve reklam aralarını kalıcı kaldırır. Bonus reklamları isteğe bağlı kalır.|Na zawsze usuwa baner i przerwy. Reklamy za bonusy zostają, tylko jeśli chcesz.
Демо: гроші не списуються. Платформа: {0}.|Demo: no money is charged. Platform: {0}.|Демо: деньги не списываются. Платформа: {0}.|Demo: no se cobra nada. Plataforma: {0}.|Demo: nada é cobrado. Plataforma: {0}.|Demo: es wird nichts berechnet. Plattform: {0}.|Démo : rien n'est débité. Plateforme : {0}.|Demo: ücret alınmaz. Platform: {0}.|Demo: nic nie jest pobierane. Platforma: {0}.
Купити за {0}|Buy for {0}|Купить за {0}|Comprar por {0}|Comprar por {0}|Kaufen für {0}|Acheter pour {0}|{0} karşılığında al|Kup za {0}
Скасувати|Cancel|Отмена|Cancelar|Cancelar|Abbrechen|Annuler|İptal|Anuluj
Реклама вже вимкнена|Ads are already off|Реклама уже отключена|Los anuncios ya están desactivados|Os anúncios já estão desativados|Werbung ist schon aus|La pub est déjà désactivée|Reklamlar zaten kapalı|Reklamy są już wyłączone
Рекламу вимкнено (демо)|Ads removed (demo)|Реклама отключена (демо)|Anuncios quitados (demo)|Anúncios removidos (demo)|Werbung entfernt (Demo)|Pub supprimée (démo)|Reklamlar kaldırıldı (demo)|Reklamy usunięte (demo)
Рівень {0} пройдено|Level {0} complete|Уровень {0} пройден|¡Nivel {0} superado!|Nível {0} concluído|Level {0} geschafft|Niveau {0} terminé|Seviye {0} tamam|Poziom {0} ukończony
Наступний буде трохи складніший.|The next one is a bit harder.|Следующий будет чуть сложнее.|El siguiente será un poco más difícil.|O próximo é um pouco mais difícil.|Das nächste wird etwas schwerer.|Le suivant sera un peu plus dur.|Sonraki biraz daha zor.|Następny będzie trochę trudniejszy.
Далі|Next|Дальше|Siguiente|Próximo|Weiter|Suivant|İleri|Dalej
До ігор|All games|К играм|A los juegos|Aos jogos|Zu den Spielen|Aux jeux|Oyunlara|Do gier
Серця скінчились|Out of hearts|Сердца закончились|Sin corazones|Sem corações|Keine Herzen mehr|Plus de cœurs|Kalp kalmadı|Koniec serc
Подивись рекламу, щоб продовжити, або почни рівень заново.|Watch an ad to continue, or restart the level.|Посмотри рекламу, чтобы продолжить, или начни уровень заново.|Mira un anuncio para seguir o reinicia el nivel.|Veja um anúncio para continuar ou reinicie o nível.|Sieh dir Werbung an, um weiterzuspielen, oder starte neu.|Regarde une pub pour continuer ou recommence le niveau.|Devam etmek için reklam izle ya da seviyeyi baştan başlat.|Obejrzyj reklamę, by grać dalej, albo zacznij od nowa.
Реклама: +1 серце|Ad: +1 heart|Реклама: +1 сердце|Anuncio: +1 corazón|Anúncio: +1 coração|Werbung: +1 Herz|Pub : +1 cœur|Reklam: +1 kalp|Reklama: +1 serce
Почати заново|Restart|Начать заново|Reiniciar|Reiniciar|Neu starten|Recommencer|Yeniden başla|Zacznij od nowa
Підказка за рекламу|Hint (ad)|Подсказка за рекламу|Pista (anuncio)|Dica (anúncio)|Tipp (Werbung)|Indice (pub)|İpucu (reklam)|Podpowiedź (reklama)
Заново|Restart|Заново|Reiniciar|Reiniciar|Neu|Rejouer|Yeniden|Od nowa
Нова гра|New game|Новая игра|Nueva partida|Novo jogo|Neues Spiel|Nouvelle partie|Yeni oyun|Nowa gra
Перемішати|Shuffle|Перемешать|Mezclar|Embaralhar|Mischen|Mélanger|Karıştır|Przetasuj
Роздати|Deal|Раздать|Repartir|Distribuir|Austeilen|Distribuer|Dağıt|Rozdaj
Нова сцена|New scene|Новая сцена|Nueva escena|Nova cena|Neue Szene|Nouvelle scène|Yeni sahne|Nowa scena
Ще раз|Again|Ещё раз|Otra vez|De novo|Nochmal|Encore|Tekrar|Jeszcze raz
Спробувати знову|Try again|Попробовать снова|Intentar de nuevo|Tentar de novo|Nochmal versuchen|Réessayer|Tekrar dene|Spróbuj ponownie
Завершити|Finish|Завершить|Terminar|Terminar|Beenden|Terminer|Bitir|Zakończ
{0} пар|{0} pairs|{0} пар|{0} parejas|{0} pares|{0} Paare|{0} paires|{0} çift|{0} par
{0} цеглин|{0} bricks|{0} кирпичей|{0} ladrillos|{0} tijolos|{0} Steine|{0} briques|{0} tuğla|{0} cegieł
{0} бл.|{0} blk|{0} бл.|{0} bl.|{0} bl.|{0} Bl.|{0} bl.|{0} blk|{0} kl.
Злиття {0}/{1}|Merges {0}/{1}|Слияния {0}/{1}|Fusiones {0}/{1}|Fusões {0}/{1}|Fusionen {0}/{1}|Fusions {0}/{1}|Birleşme {0}/{1}|Połączenia {0}/{1}
Бус {0}/{1}|Bus {0}/{1}|Автобус {0}/{1}|Bus {0}/{1}|Ônibus {0}/{1}|Bus {0}/{1}|Bus {0}/{1}|Otobüs {0}/{1}|Autobus {0}/{1}
Коти {0}/{1}|Cats {0}/{1}|Коты {0}/{1}|Gatos {0}/{1}|Gatos {0}/{1}|Katzen {0}/{1}|Chats {0}/{1}|Kediler {0}/{1}|Koty {0}/{1}
Хвиля {0}/{1}|Wave {0}/{1}|Волна {0}/{1}|Oleada {0}/{1}|Onda {0}/{1}|Welle {0}/{1}|Vague {0}/{1}|Dalga {0}/{1}|Fala {0}/{1}
Вбито {0}|Kills {0}|Убито {0}|Bajas {0}|Abates {0}|Kills {0}|Tués {0}|Öldürme {0}|Zabici {0}
Монети {0}|Coins {0}|Монеты {0}|Monedas {0}|Moedas {0}|Münzen {0}|Pièces {0}|Para {0}|Monety {0}
Енергія {0}/{1}|Energy {0}/{1}|Энергия {0}/{1}|Energía {0}/{1}|Energia {0}/{1}|Energie {0}/{1}|Énergie {0}/{1}|Enerji {0}/{1}|Energia {0}/{1}
Зірки {0}/{1}|Stars {0}/{1}|Звёзды {0}/{1}|Estrellas {0}/{1}|Estrelas {0}/{1}|Sterne {0}/{1}|Étoiles {0}/{1}|Yıldız {0}/{1}|Gwiazdki {0}/{1}
Злиття!|Merge!|Слияние!|¡Fusión!|Fusão!|Fusion!|Fusion !|Birleşti!|Połączone!
Комбо ×{0}|Combo ×{0}|Комбо ×{0}|Combo ×{0}|Combo ×{0}|Kombo ×{0}|Combo ×{0}|Kombo ×{0}|Kombo ×{0}
Каса переповнена|The till is full|Касса переполнена|La caja está llena|O caixa está cheio|Die Kasse ist voll|La caisse est pleine|Kasa dolu|Kasa jest pełna
Для нової роздачі не вистачає місця.|Not enough room for a new deal.|Для новой раздачи не хватает места.|No hay sitio para repartir.|Sem espaço para distribuir.|Kein Platz zum Austeilen.|Pas assez de place pour distribuer.|Yeni dağıtım için yer yok.|Brak miejsca na rozdanie.
Реклама: звільнити відсік|Ad: empty a slot|Реклама: освободить отсек|Anuncio: vaciar un hueco|Anúncio: liberar um espaço|Werbung: Fach leeren|Pub : vider une case|Reklam: bir bölmeyi boşalt|Reklama: opróżnij przegrodę
Місця немає|No room left|Места нет|No queda sitio|Sem espaço|Kein Platz mehr|Plus de place|Yer kalmadı|Brak miejsca
Рахунок:|Score:|Счёт:|Puntos:|Pontos:|Punkte:|Score :|Skor:|Wynik:
· рекорд {0}|· best {0}|· рекорд {0}|· récord {0}|· recorde {0}|· Rekord {0}|· record {0}|· rekor {0}|· rekord {0}
Реклама: розчистити центр|Ad: clear the centre|Реклама: расчистить центр|Anuncio: limpiar el centro|Anúncio: limpar o centro|Werbung: Mitte räumen|Pub : vider le centre|Reklam: ortayı temizle|Reklama: wyczyść środek
Далі:|Next:|Дальше:|Siguiente:|Próximo:|Nächster:|Ensuite :|Sıradaki:|Następny:
Платформа переповнена|The platform is full|Платформа переполнена|El andén está lleno|A plataforma está cheia|Der Bahnsteig ist voll|Le quai est plein|Peron dolu|Peron jest pełny
Усі місця очікування зайняті.|Every waiting spot is taken.|Все места ожидания заняты.|Todos los sitios de espera están ocupados.|Todos os lugares de espera estão ocupados.|Alle Warteplätze sind belegt.|Toutes les places d'attente sont prises.|Tüm bekleme yerleri dolu.|Wszystkie miejsca oczekiwania są zajęte.
Реклама: +1 місце на платформі|Ad: +1 waiting spot|Реклама: +1 место на платформе|Anuncio: +1 sitio|Anúncio: +1 lugar|Werbung: +1 Platz|Pub : +1 place|Reklam: +1 yer|Reklama: +1 miejsce
Гніздо переповнене|The nest is full|Гнездо переполнено|El nido está lleno|O ninho está cheio|Das Nest ist voll|Le nid est plein|Yuva dolu|Gniazdo jest pełne
Змійці нікуди повернутися.|The snake has nowhere to go back to.|Змейке некуда вернуться.|La serpiente no tiene adónde volver.|A cobra não tem para onde voltar.|Die Schlange kann nirgends zurück.|Le serpent n'a nulle part où revenir.|Yılanın döneceği yer yok.|Wąż nie ma dokąd wrócić.
Реклама: +1 місце в гнізді|Ad: +1 nest spot|Реклама: +1 место в гнезде|Anuncio: +1 hueco|Anúncio: +1 lugar|Werbung: +1 Nestplatz|Pub : +1 place|Reklam: +1 yuva yeri|Reklama: +1 miejsce
Торкнись, щоб почати|Tap to start|Коснись, чтобы начать|Toca para empezar|Toque para começar|Tippe zum Starten|Touche pour commencer|Başlamak için dokun|Dotknij, aby zacząć
свайп ← → змінює смугу, ↑ стрибок|swipe ← → to change lane, ↑ to jump|свайп ← → меняет полосу, ↑ прыжок|desliza ← → para cambiar de carril, ↑ para saltar|deslize ← → para trocar de faixa, ↑ para pular|wische ← → für Spurwechsel, ↑ zum Springen|glisse ← → pour changer de voie, ↑ pour sauter|şerit için ← → kaydır, zıplamak için ↑|przesuń ← → by zmienić pas, ↑ skok
Бум!|Crash!|Бум!|¡Pum!|Bum!|Bumm!|Boum !|Bum!|Bum!
Реклама: продовжити|Ad: continue|Реклама: продолжить|Anuncio: continuar|Anúncio: continuar|Werbung: weiter|Pub : continuer|Reklam: devam et|Reklama: kontynuuj
веди пальцем вліво/вправо|slide left / right|веди пальцем влево/вправо|desliza a izquierda/derecha|deslize para os lados|wische links/rechts|glisse à gauche/droite|sola/sağa kaydır|przesuwaj w lewo/prawo
ліворуч зомбі, праворуч ворота зброї|zombies on the left, weapon gates on the right|слева зомби, справа ворота оружия|zombis a la izquierda, armas a la derecha|zumbis à esquerda, armas à direita|links Zombies, rechts Waffentore|zombies à gauche, armes à droite|solda zombiler, sağda silah kapıları|po lewej zombie, po prawej bramy broni
Бос!|Boss!|Босс!|¡Jefe!|Chefe!|Boss!|Boss !|Patron!|Boss!
Боса знищено!|Boss down!|Босс повержен!|¡Jefe derrotado!|Chefe derrotado!|Boss besiegt!|Boss vaincu !|Patron yenildi!|Boss pokonany!
Ой! Це був вцілілий|Oops! That was a survivor|Ой! Это был выживший|¡Uy! Era un superviviente|Ops! Era um sobrevivente|Hoppla! Das war ein Überlebender|Oups ! C'était un survivant|Eyvah! O bir hayatta kalandı|Ups! To był ocalały
+1 боєць|+1 fighter|+1 боец|+1 luchador|+1 lutador|+1 Kämpfer|+1 combattant|+1 savaşçı|+1 wojownik
Нова зброя: {0}|New weapon: {0}|Новое оружие: {0}|Nueva arma: {0}|Nova arma: {0}|Neue Waffe: {0}|Nouvelle arme : {0}|Yeni silah: {0}|Nowa broń: {0}
Оборону прорвано|The defence broke|Оборона прорвана|Defensa rota|Defesa rompida|Verteidigung durchbrochen|Défense percée|Savunma çöktü|Obrona przełamana
Вбито:|Kills:|Убито:|Bajas:|Abates:|Kills:|Tués :|Öldürme:|Zabici:
Зброя: {0}|Weapon: {0}|Оружие: {0}|Arma: {0}|Arma: {0}|Waffe: {0}|Arme : {0}|Silah: {0}|Broń: {0}
Пістолет|Pistol|Пистолет|Pistola|Pistola|Pistole|Pistolet|Tabanca|Pistolet
Пістолет-кулемет|SMG|ПП|Subfusil|Submetralhadora|MP|Mitraillette|Hafif makineli|Pistolet maszynowy
Автомат|Assault rifle|Автомат|Fusil de asalto|Fuzil|Sturmgewehr|Fusil d'assaut|Piyade tüfeği|Karabin
Дробовик|Shotgun|Дробовик|Escopeta|Espingarda|Schrotflinte|Fusil à pompe|Pompalı|Strzelba
Мініган|Minigun|Миниган|Minigun|Minigun|Minigun|Minigun|Minigun|Minigun
Лазер|Laser|Лазер|Láser|Laser|Laser|Laser|Lazer|Laser
веди пальцем, щоб вибрати ворота|slide to pick a gate|веди пальцем, чтобы выбрать ворота|desliza para elegir puerta|deslize para escolher o portão|wische, um ein Tor zu wählen|glisse pour choisir une porte|kapı seçmek için kaydır|przesuń, by wybrać bramę
Натовп розбито|Your crowd was beaten|Толпа разбита|Tu multitud perdió|Sua multidão perdeu|Deine Menge wurde besiegt|Ta foule a perdu|Kalabalığın yenildi|Twój tłum przegrał
Обирай вигідніші ворота: вони сині, а ×2 найкращі, коли людей багато.|Pick the better gates: blue ones help, and ×2 is best when the crowd is big.|Выбирай выгодные ворота: синие помогают, а ×2 лучше всего, когда людей много.|Elige las mejores puertas: las azules ayudan y ×2 es lo mejor con mucha gente.|Escolha os melhores portões: os azuis ajudam e ×2 é o melhor com muita gente.|Wähle bessere Tore: blaue helfen, ×2 ist am besten bei großer Menge.|Choisis les meilleures portes : les bleues aident, et ×2 est idéal avec une grande foule.|Daha iyi kapıları seç: maviler yardım eder, kalabalık büyükken ×2 en iyisidir.|Wybieraj lepsze bramy: niebieskie pomagają, a ×2 jest najlepsze przy dużym tłumie.
Реклама: +20 людей|Ad: +20 people|Реклама: +20 человек|Anuncio: +20 personas|Anúncio: +20 pessoas|Werbung: +20 Leute|Pub : +20 personnes|Reklam: +20 kişi|Reklama: +20 osób
Мета:|Goal:|Цель:|Meta:|Meta:|Ziel:|Objectif :|Hedef:|Cel:
Здати|Deliver|Сдать|Entregar|Entregar|Abgeben|Livrer|Teslim et|Oddaj
Потрібно|Needed|Нужно|Falta|Falta|Benötigt|Requis|Gerekli|Potrzebne
Енергія за рекламу|Energy (ad)|Энергия за рекламу|Energía (anuncio)|Energia (anúncio)|Energie (Werbung)|Énergie (pub)|Enerji (reklam)|Energia (reklama)
Історія|Story|История|Historia|História|Geschichte|Histoire|Hikaye|Historia
Новий розділ!|New chapter!|Новая глава!|¡Nuevo capítulo!|Novo capítulo!|Neues Kapitel!|Nouveau chapitre !|Yeni bölüm!|Nowy rozdział!
Енергія скінчилась|Out of energy|Энергия закончилась|Sin energía|Sem energia|Keine Energie|Plus d'énergie|Enerji bitti|Brak energii
Вона відновлюється сама (1 за 20 секунд) або одразу за рекламу.|It refills by itself (1 every 20 seconds) or instantly for an ad.|Она восстанавливается сама (1 за 20 секунд) или сразу за рекламу.|Se recarga sola (1 cada 20 s) o al instante con un anuncio.|Recarrega sozinha (1 a cada 20 s) ou na hora com um anúncio.|Lädt sich selbst auf (1 alle 20 s) oder sofort per Werbung.|Elle se recharge seule (1 toutes les 20 s) ou tout de suite avec une pub.|Kendiliğinden dolar (20 saniyede 1) ya da reklamla anında.|Odnawia się sama (1 co 20 s) albo od razu za reklamę.
Реклама: +20 енергії|Ad: +20 energy|Реклама: +20 энергии|Anuncio: +20 energía|Anúncio: +20 energia|Werbung: +20 Energie|Pub : +20 énergie|Reklam: +20 enerji|Reklama: +20 energii
Почекаю|I'll wait|Подожду|Esperaré|Vou esperar|Ich warte|J'attends|Beklerim|Poczekam
Немає місця: злий щось|No room: merge something|Нет места: объедини что-нибудь|Sin sitio: fusiona algo|Sem espaço: junte algo|Kein Platz: verschmelze etwas|Plus de place : fusionne|Yer yok: bir şey birleştir|Brak miejsca: połącz coś
Тапни ящик, щоб отримати предмет. Перетягни два однакові, щоб злити. Виконуй замовлення, щоб отримати зірки.|Tap the crate for an item. Drag two equal items together to merge. Fill orders to earn stars.|Тапни ящик, чтобы получить предмет. Перетащи два одинаковых, чтобы объединить. Выполняй заказы, чтобы получать звёзды.|Toca la caja para un objeto. Junta dos iguales para fusionar. Completa pedidos para ganar estrellas.|Toque na caixa para um item. Junte dois iguais para fundir. Complete pedidos para ganhar estrelas.|Tippe auf die Kiste für ein Teil. Zieh zwei gleiche zusammen. Erfülle Aufträge für Sterne.|Touche la caisse pour un objet. Assemble deux objets identiques. Remplis les commandes pour gagner des étoiles.|Eşya için sandığa dokun. İki aynısını birleştir. Yıldız için siparişleri tamamla.|Dotknij skrzyni po przedmiot. Połącz dwa takie same. Realizuj zamówienia, by zdobyć gwiazdki.
Обери мову|Choose your language|Выбери язык|Elige tu idioma|Escolha o idioma|Wähle deine Sprache|Choisis ta langue|Dilini seç|Wybierz język
Придумай нікнейм|Pick a nickname|Придумай никнейм|Elige un apodo|Escolha um apelido|Wähle einen Spitznamen|Choisis un pseudo|Bir takma ad seç|Wybierz pseudonim
Його побачать інші гравці в рейтингу.|Other players will see it in the leaderboard.|Его увидят другие игроки в рейтинге.|Otros jugadores lo verán en la clasificación.|Outros jogadores verão no ranking.|Andere sehen ihn in der Bestenliste.|Les autres joueurs le verront au classement.|Diğer oyuncular sıralamada görecek.|Inni gracze zobaczą go w rankingu.
6–16 символів: літери, цифри, _ . - (не лише цифри). Одна зміна безкоштовна.|6–16 characters: letters, digits, _ . - (not digits only). One change is free.|6–16 символов: буквы, цифры, _ . - (не только цифры). Одна смена бесплатно.|6–16 caracteres: letras, números, _ . - (no solo números). Un cambio gratis.|6–16 caracteres: letras, números, _ . - (não só números). Uma troca grátis.|6–16 Zeichen: Buchstaben, Ziffern, _ . - (nicht nur Ziffern). Eine Änderung gratis.|6–16 caractères : lettres, chiffres, _ . - (pas que des chiffres). Un changement gratuit.|6–16 karakter: harf, rakam, _ . - (sadece rakam olmaz). Bir değişiklik ücretsiz.|6–16 znaków: litery, cyfry, _ . - (nie same cyfry). Jedna zmiana za darmo.
Зберегти|Save|Сохранить|Guardar|Salvar|Speichern|Enregistrer|Kaydet|Zapisz
Пізніше|Later|Позже|Más tarde|Depois|Später|Plus tard|Sonra|Później
Перевіряю…|Checking…|Проверяю…|Comprobando…|Verificando…|Prüfe…|Vérification…|Kontrol ediliyor…|Sprawdzam…
Нікнейм вільний|Nickname is free|Никнейм свободен|Apodo disponible|Apelido disponível|Name ist frei|Pseudo disponible|Takma ad uygun|Pseudonim wolny
Цей нікнейм уже зайнятий|That nickname is taken|Этот никнейм уже занят|Ese apodo ya está en uso|Esse apelido já está em uso|Dieser Name ist vergeben|Ce pseudo est déjà pris|Bu takma ad alınmış|Ten pseudonim jest zajęty
Потрібно 6–16 символів без пробілів і спецзнаків|Use 6–16 characters, no spaces or symbols|Нужно 6–16 символов без пробелов и спецзнаков|Usa 6–16 caracteres, sin espacios ni símbolos|Use 6–16 caracteres, sem espaços ou símbolos|6–16 Zeichen ohne Leerzeichen und Sonderzeichen|6–16 caractères, sans espaces ni symboles|Boşluk ve sembol olmadan 6–16 karakter|6–16 znaków, bez spacji i symboli
Нікнейм не може бути лише з цифр|A nickname can't be digits only|Никнейм не может состоять только из цифр|El apodo no puede ser solo números|O apelido não pode ter só números|Nur Ziffern sind nicht erlaubt|Le pseudo ne peut pas être que des chiffres|Takma ad sadece rakam olamaz|Pseudonim nie może składać się z samych cyfr
Цей нікнейм не підходить|That nickname isn't allowed|Этот никнейм не подходит|Ese apodo no está permitido|Esse apelido não é permitido|Dieser Name ist nicht erlaubt|Ce pseudo n'est pas autorisé|Bu takma ada izin verilmiyor|Ten pseudonim jest niedozwolony
Нікнейм збережено|Nickname saved|Никнейм сохранён|Apodo guardado|Apelido salvo|Name gespeichert|Pseudo enregistré|Takma ad kaydedildi|Pseudonim zapisany
Немає зв'язку з сервером|Can't reach the server|Нет связи с сервером|Sin conexión con el servidor|Sem conexão com o servidor|Server nicht erreichbar|Serveur injoignable|Sunucuya ulaşılamıyor|Brak połączenia z serwerem
Наступна зміна нікнейму платна|The next nickname change is paid|Следующая смена ника платная|El próximo cambio de apodo es de pago|A próxima troca de apelido é paga|Die nächste Änderung ist kostenpflichtig|Le prochain changement est payant|Sonraki değişiklik ücretli|Kolejna zmiana jest płatna
Профіль|Profile|Профиль|Perfil|Perfil|Profil|Profil|Profil|Profil
Мова|Language|Язык|Idioma|Idioma|Sprache|Langue|Dil|Język
Змінити нікнейм|Change nickname|Сменить никнейм|Cambiar apodo|Trocar apelido|Namen ändern|Changer de pseudo|Takma adı değiştir|Zmień pseudonim
Гравець|Player|Игрок|Jugador|Jogador|Spieler|Joueur|Oyuncu|Gracz
Топ|Top|Топ|Top|Top|Top|Top|Top|Top
Рейтинг|Leaderboard|Рейтинг|Clasificación|Ranking|Bestenliste|Classement|Sıralama|Ranking
Твоє місце: #{0}|Your place: #{0}|Твоё место: #{0}|Tu puesto: #{0}|Sua posição: #{0}|Dein Platz: #{0}|Ta place : #{0}|Sıran: #{0}|Twoje miejsce: #{0}
Поки порожньо. Стань першим!|Empty so far. Be the first!|Пока пусто. Стань первым!|Aún vacío. ¡Sé el primero!|Vazio por enquanto. Seja o primeiro!|Noch leer. Sei der Erste!|Vide pour l'instant. Sois le premier !|Henüz boş. İlk sen ol!|Na razie pusto. Bądź pierwszy!
Рейтинг запрацює після підключення сервера.|The leaderboard works once the server is connected.|Рейтинг заработает после подключения сервера.|La clasificación funcionará al conectar el servidor.|O ranking funciona após conectar o servidor.|Die Bestenliste geht, sobald der Server verbunden ist.|Le classement marchera une fois le serveur connecté.|Sıralama sunucu bağlanınca çalışır.|Ranking zadziała po podłączeniu serwera.
Щоб потрапити в рейтинг, придумай нікнейм.|Pick a nickname to get on the leaderboard.|Чтобы попасть в рейтинг, придумай никнейм.|Elige un apodo para entrar en la clasificación.|Escolha um apelido para entrar no ranking.|Wähle einen Namen für die Bestenliste.|Choisis un pseudo pour entrer au classement.|Sıralamaya girmek için takma ad seç.|Wybierz pseudonim, by trafić do rankingu.
Завантаження…|Loading…|Загрузка…|Cargando…|Carregando…|Lädt…|Chargement…|Yükleniyor…|Ładowanie…
очок|pts|очков|pts|pts|Pkt.|pts|puan|pkt
Очки|Score|Очки|Puntos|Pontos|Punkte|Points|Puan|Punkty
Отримано очок|Points earned|Получено очков|Puntos ganados|Pontos ganhos|Erzielte Punkte|Points gagnés|Kazanılan puan|Zdobyte punkty
Зупини стрілку й помнож очки!|Stop the needle to multiply your points!|Останови стрелку и умножь очки!|¡Detén la aguja y multiplica tus puntos!|Pare o ponteiro e multiplique seus pontos!|Stopp die Nadel und vervielfache deine Punkte!|Arrête l'aiguille pour multiplier tes points !|İğneyi durdur, puanını katla!|Zatrzymaj wskazówkę i pomnóż punkty!
Забрати {0}|Take {0}|Забрать {0}|Tomar {0}|Pegar {0}|{0} nehmen|Prendre {0}|{0} al|Odbierz {0}
Стоп: множник за рекламу|Stop: multiplier for an ad|Стоп: множитель за рекламу|Parar: multiplicador por anuncio|Parar: multiplicador por anúncio|Stopp: Multiplikator für Werbung|Stop : multiplicateur contre une pub|Dur: reklamla çarpan|Stop: mnożnik za reklamę
Множник ×{0}!|Multiplier ×{0}!|Множитель ×{0}!|¡Multiplicador ×{0}!|Multiplicador ×{0}!|Multiplikator ×{0}!|Multiplicateur ×{0} !|Çarpan ×{0}!|Mnożnik ×{0}!
Підказка ({0})|Hint ({0})|Подсказка ({0})|Pista ({0})|Dica ({0})|Tipp ({0})|Indice ({0})|İpucu ({0})|Podpowiedź ({0})
Реклама: повернути 2 плитки|Ad: return 2 tiles|Реклама: вернуть 2 плитки|Anuncio: devolver 2 fichas|Anúncio: devolver 2 peças|Werbung: 2 Steine zurück|Pub : rendre 2 tuiles|Reklam: 2 taşı geri al|Reklama: zwróć 2 płytki
Сховок заповнений|The tray is full|Лоток заполнен|La bandeja está llena|A bandeja está cheia|Die Ablage ist voll|Le plateau est plein|Tepsi dolu|Taca jest pełna
4 різні плитки без пари. Відкривай плитки й запам'ятовуй малюнки.|4 different tiles and no pair. Flip tiles and remember the pictures.|4 разные плитки без пары. Открывай плитки и запоминай рисунки.|4 fichas distintas sin pareja. Voltea fichas y recuerda los dibujos.|4 peças diferentes sem par. Vire peças e lembre os desenhos.|4 verschiedene Steine ohne Paar. Dreh Steine um und merk dir die Bilder.|4 tuiles différentes sans paire. Retourne et mémorise les images.|Eşi olmayan 4 farklı taş. Taşları çevir, resimleri hatırla.|4 różne płytki bez pary. Odkrywaj i zapamiętuj obrazki.
Пар немає, перемішай|No pairs, shuffle|Пар нет, перемешай|Sin parejas, mezcla|Sem pares, embaralhe|Keine Paare, mischen|Pas de paires, mélange|Çift yok, karıştır|Brak par, przetasuj
Перемішано|Shuffled|Перемешано|Mezclado|Embaralhado|Gemischt|Mélangé|Karıştırıldı|Przetasowano
ліворуч клітки з людьми, посередині зомбі, праворуч зброя|left: cages with people, middle: zombies, right: weapons|слева клетки с людьми, в центре зомби, справа оружие|izquierda: jaulas con gente, centro: zombis, derecha: armas|esquerda: jaulas com pessoas, meio: zumbis, direita: armas|links Käfige mit Leuten, Mitte Zombies, rechts Waffen|à gauche des cages, au centre des zombies, à droite des armes|solda kafesler, ortada zombiler, sağda silahlar|po lewej klatki z ludźmi, w środku zombie, po prawej broń
Лови зброю: {0}!|Catch the weapon: {0}!|Лови оружие: {0}!|¡Atrapa el arma: {0}!|Pegue a arma: {0}!|Schnapp dir die Waffe: {0}!|Attrape l'arme : {0} !|Silahı yakala: {0}!|Złap broń: {0}!
Зброю пропущено|Weapon missed|Оружие пропущено|Arma perdida|Arma perdida|Waffe verpasst|Arme ratée|Silah kaçtı|Broń przepadła
+{0} бійців|+{0} fighters|+{0} бойцов|+{0} luchadores|+{0} lutadores|+{0} Kämpfer|+{0} combattants|+{0} savaşçı|+{0} wojowników
Бос попереду!|Boss ahead!|Босс впереди!|¡Jefe delante!|Chefe à frente!|Boss voraus!|Boss en vue !|Önde patron var!|Boss przed tobą!
У боса {0} HP. Подвоїти натовп за рекламу?|The boss has {0} HP. Double your crowd for an ad?|У босса {0} HP. Удвоить толпу за рекламу?|El jefe tiene {0} PV. ¿Duplicar tu multitud por un anuncio?|O chefe tem {0} HP. Dobrar a multidão por um anúncio?|Der Boss hat {0} HP. Menge für Werbung verdoppeln?|Le boss a {0} PV. Doubler ta foule contre une pub ?|Patronun {0} canı var. Reklamla kalabalığı ikiye katla?|Boss ma {0} HP. Podwoić tłum za reklamę?
×2 людей за рекламу|×2 people for an ad|×2 людей за рекламу|×2 personas por anuncio|×2 pessoas por anúncio|×2 Leute für Werbung|×2 personnes contre une pub|Reklamla ×2 kişi|×2 osób za reklamę
Ні, вперед!|No, go!|Нет, вперёд!|¡No, adelante!|Não, vamos!|Nein, los!|Non, en avant !|Hayır, ileri!|Nie, naprzód!
Звук: увімкнено|Sound: on|Звук: включён|Sonido: sí|Som: ligado|Ton: an|Son : activé|Ses: açık|Dźwięk: wł.
Звук: вимкнено|Sound: off|Звук: выключен|Sonido: no|Som: desligado|Ton: aus|Son : coupé|Ses: kapalı|Dźwięk: wył.
Увійди через Telegram, щоб мати один акаунт у браузері й у Telegram.|Log in with Telegram to use one account in the browser and in Telegram.|Войди через Telegram, чтобы иметь один аккаунт в браузере и в Telegram.|Entra con Telegram para usar una sola cuenta en el navegador y en Telegram.|Entre com o Telegram para usar uma conta no navegador e no Telegram.|Melde dich mit Telegram an, um ein Konto im Browser und in Telegram zu nutzen.|Connecte-toi avec Telegram pour un seul compte dans le navigateur et Telegram.|Tarayıcıda ve Telegram'da tek hesap için Telegram ile giriş yap.|Zaloguj się przez Telegram, by mieć jedno konto w przeglądarce i w Telegramie.
Акаунт Telegram підключено|Telegram account connected|Аккаунт Telegram подключён|Cuenta de Telegram conectada|Conta do Telegram conectada|Telegram-Konto verbunden|Compte Telegram connecté|Telegram hesabı bağlandı|Konto Telegram połączone
Без помилок: множник росте|No mistakes: the multiplier grows|Без ошибок: множитель растёт|Sin errores: el multiplicador sube|Sem erros: o multiplicador sobe|Fehlerfrei: Multiplikator steigt|Sans erreur : le multiplicateur monte|Hatasız: çarpan artar|Bez błędów: mnożnik rośnie
`;

const DICT: Record<string, Record<string, string>> = {};
const PATTERNS: { re: RegExp; key: string }[] = [];
for (const line of TABLE.split('\n')) {
  if (!line.trim()) continue;
  const cols = line.split('|'), key = cols[0];
  ORDER.forEach((l, i) => { if (cols[i]) (DICT[l] ||= {})[key] = cols[i]; });
  if (key.includes('{')) PATTERNS.push({ re: new RegExp('^' + key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\d\}/g, '(.+?)') + '$'), key });
}

export let lang: string = store.get<string>('lang', '') || '';
export const hasLang = () => !!store.get<string>('lang', '');
export function setLang(l: string) { lang = l; store.set('lang', l); document.documentElement.lang = l; translateTree(document.body); }

const look = (k: string) => lang === 'uk' ? k : DICT[lang]?.[k] ?? DICT.en?.[k] ?? k;
const fill = (s: string, a: string[]) => s.replace(/\{(\d)\}/g, (_, i) => a[+i] ?? '');

/** translate one source string (uk) to the current language */
export function t(s: string, ...args: (string | number)[]): string {
  return fill(look(s), args.map(String));
}
function translateText(raw: string): string | null {
  if (lang === 'uk' || !lang) return null;
  const s = raw.trim(); if (!s || !/[А-Яа-яІіЇїЄєҐґ]/.test(s)) return null;
  let out: string | null = null;
  if (DICT.en?.[s] != null || DICT[lang]?.[s] != null) out = look(s);
  else for (const p of PATTERNS) { const m = s.match(p.re); if (m) { out = fill(look(p.key), m.slice(1).map(x => translateText(x) ?? x)); break; } }
  return out == null ? null : raw.replace(s, out);
}
const ATTRS = ['aria-label', 'title', 'placeholder'];
export function translateTree(root: Node) {
  if (root.nodeType === 3) { const v = translateText(root.nodeValue || ''); if (v != null && v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const tv = translateText(v); if (tv != null) el.setAttribute(a, tv); } }
  el.childNodes.forEach(translateTree);
}
export function startAutoTranslate() {
  document.documentElement.lang = lang || 'uk';
  translateTree(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') translateTree(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
