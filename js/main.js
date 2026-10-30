const dialog = document.getElementById('sidebar-dialog');
const openBtn = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('menu-close');

openBtn.addEventListener('click', () => dialog.showModal());
closeBtn.addEventListener('click', () => dialog.close());

// Close if the user clicks the outer backdrop area
dialog.addEventListener('click', (e) => {
  const rect = dialog.getBoundingClientRect();
  const clickedInDialog = (
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width
  );
  if (!clickedInDialog) dialog.close();
});

// Dynamic games carousel for index.html
const track = document.getElementById("carousel-track");
const prevBtn = document.getElementById("carousel-prev");
const nextBtn = document.getElementById("carousel-next");
const dotsContainer = document.getElementById("carousel-dots");

if(track && typeof GAMES_CATALOG !== "undefined")
{
  const gameEntries = Object.entries(GAMES_CATALOG).slice(1, 4);
  let currentIndex = 0;

  //render first 3 games and link to games page
  gameEntries.forEach(([key,game]) => {
    const card = document.createElement("div");
    card.className = "carousel-slide";
    card.innerHTML = `
      <div class="game-card">
        <div class="card-content">
          <span class="game-genre">${game.genre || 'Arcade'}</span>
          <h3>${game.title}</h3>
          <p>${game.description}</p>
        </div>
        <a href="play.html?game=${key}" class="play-btn">Play Now</a>
      </div>
    `;
    track.appendChild(card);
  });

  const catalogCard = document.createElement("div");
  catalogCard.className = "carousel-slide";
  catalogCard.innerHTML = `
    <div class="game-card catalog-cta-card">
      <div class="card-content">
        <span class="game-genre">Directory</span>
        <h3>More Projects</h3>
        <p>Explore full playable games and prototypes in the catalog.</p>
      </div>
      <a href="gamecatalog.html" class="play-btn catalog-btn">
        <span>View Full Catalog</span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    </div>
  `;
  track.appendChild(catalogCard);

  const totalSlides = track.children.length;

  if(dotsContainer)
  {
    for(let i = 0; i < totalSlides; i++)
    {
      const dot = document.createElement("button");
      dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
      dot.setAttribute("aria-label", `Go to Slide ${i + 1}`);
      dot.addEventListener("click", () => updateSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function updateSlide(index)
  {
    currentIndex = (index + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    if(dotsContainer)
    {
      const dots = dotsContainer.querySelectorAll(".carousel-dot");
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIndex);
      });
    }
  }

  //Carousel navigation controls
  if(prevBtn)
  {
    prevBtn.addEventListener("click", () => updateSlide(currentIndex - 1));
  }
  if(nextBtn)
  {
    nextBtn.addEventListener("click", () => updateSlide(currentIndex + 1));
  }

}