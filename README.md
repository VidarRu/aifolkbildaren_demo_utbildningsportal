# AI i folkbibliotekets praktik – demoversion

Demoversion av resurssidan [AI i folkbibliotekets praktik](https://vidarru.github.io/ai-i-folkbibliotekets-praktik/),
för att visa upp upplägg och design för intresserade.

- Sidan har ingen startsida med lösenord, den öppnas direkt.
- Rubriker, menyer och struktur är som i originalet. All löptext är utbytt mot lorem ipsum.
- Alla inspelningar och instruktionsvideor visar en och samma demovideo (`assets/video/demo.mp4`).
- Presentationerna är ersatta av platshållarbilder (`assets/img/omslag-del1–3.jpg`).
- Övningsmaterialet (PDF) ingår inte. Länkarna visar en ruta om att materialet inte ingår i demot.
- Affischerna (CC BY 4.0) finns kvar.
- Demot sparar bockade uppgifter under en egen nyckel (`aifp-demo-uppgifter`), så det krockar inte med originalsajten på samma domän.

## Uppdatera från originalet

Skriptet läser originalets `index.html` och skriver om `index.html` här. Originaltexten checkas aldrig in i det här repot.

```bash
git clone https://github.com/VidarRu/ai-i-folkbibliotekets-praktik ../ai-i-folkbibliotekets-praktik
python3 tools/gor_demo.py ../ai-i-folkbibliotekets-praktik/index.html
```

`assets/css/style.css` och `assets/js/main.js` är kopior av originalets filer med några tillägg för demot. Om originalet ändras behöver de tilläggen föras över för hand: att startsidan med lösenord är borttagen, nyckeln `aifp-demo-uppgifter`, demovideospelaren, demorutan och ljusrutan utan PDF-knapp.
