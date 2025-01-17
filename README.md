# AI.photoalbum
AI-Driven Photo Album Creator

Beskrivning
Detta projekt är en AI-driven applikation som hjälper användare att automatiskt organisera sina foton, välja de bästa bilderna från kluster av liknande bilder och ladda ner ett skräddarsytt fotoalbum. Applikationen kombinerar maskininlärning, bildanalys och en användarvänlig gränssnitt för att erbjuda en sömlös upplevelse.

Funktioner
Automatisk bildanalys:
Använder en förtränad AI-modell, ResNet50, för att analysera bilder och extrahera egenskaper.
Klustring av bilder:
Grupperar liknande bilder med hjälp av DBSCAN, en klustringsalgoritm för oövervakad inlärning.
Val av bästa bild:
Bedömer skärpa, exponering och ansiktsigenkänning för att automatiskt välja den bästa bilden i varje kluster.
Organiserat album:
Skapar ett fotoalbum med användarens valda bilder, vilket kan laddas ner som en zip-fil.

Tekniker
AI och maskininlärning:
ResNet50 för feature extraction.
DBSCAN för bildklustring.
Bildanalys:
Laplacian-metoden för att mäta skärpa.
Histogramanalys för att utvärdera exponering.
OpenCV:s Haar-cascade för ansiktsdetektering.
Backend:
Flask för att hantera API-anrop och serverlogik.
Frontend:
React för ett interaktivt och användarvänligt gränssnitt.

Hur Det Fungerar
Ladda upp bilder:
Användaren laddar upp sina bilder, som sparas i en temporär mapp.
AI-analys och organisation:
Bilder analyseras och grupperas baserat på visuella likheter och tidsmetadata.
Välj bästa bilder:
Användaren kan se och ändra AI:ns val av bästa bilder i varje kluster.
Ladda ner albumet:
Det färdiga albumet laddas ner som en zip-fil, innehållande användarens valda bilder.

Framtida Förbättringar
Implementera en tränad AI-modell för att ersätta heuristisk bildval.
Stöd för fler bildformat och videoextraktion.
Utveckla mobilvänliga funktioner för bättre användarupplevelse.

Installation och Körning
Krav:
Python 3.8+
Node.js och npm

Installera backend:
cd Backend
pip install -r requirements.txt
flask run

Starta frontend:
cd Frontend
npm install
npm start
Öppna http://localhost:8000 i din webbläsare.


Skapad av: Melanie Käller