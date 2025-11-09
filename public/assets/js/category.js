async function loadCategories() {
    try {
      // Load from file first
      const res = await fetch('assets/data/categories.json');
      const fileCategories = await res.json();
      
      // Load admin-created categories from localStorage
      const adminCategories = JSON.parse(localStorage.getItem('adminCategories') || '[]');
      const mainCategories = JSON.parse(localStorage.getItem('mainCategories') || '[]');
      
      // Combine all categories
      const allCategories = [...fileCategories, ...adminCategories, ...mainCategories];
      
      // Remove duplicates based on category ID
      const uniqueCategories = allCategories.filter((category, index, self) => 
        index === self.findIndex(c => c.id === category.id)
      );
      
      const container = document.getElementById("category-container");
      
      uniqueCategories.forEach(category => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>${category.name}</h3>
          <p>${category.description || ''}</p>
          <a href="category.html?cat=${category.id}">View Exams</a>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      // If file doesn't exist, try to load only admin categories
      const adminCategories = JSON.parse(localStorage.getItem('adminCategories') || '[]');
      const mainCategories = JSON.parse(localStorage.getItem('mainCategories') || '[]');
      
      const allCategories = [...adminCategories, ...mainCategories];
      const uniqueCategories = allCategories.filter((category, index, self) => 
        index === self.findIndex(c => c.id === category.id)
      );
      
      const container = document.getElementById("category-container");
      
      uniqueCategories.forEach(category => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>${category.name}</h3>
          <p>${category.description || ''}</p>
          <a href="category.html?cat=${category.id}">View Exams</a>
        `;
        container.appendChild(card);
      });
    }
  }
  
  loadCategories();
  