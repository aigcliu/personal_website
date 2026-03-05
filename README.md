# Yi Liu - Personal Website

A modern, responsive personal website showcasing my professional profile, research publications, and open-source projects.

## 🌟 Features

- **Responsive Design**: Fully responsive layout that works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between dark and light themes with smooth transitions
- **Modern UI**: Clean, professional design with smooth animations and transitions
- **Accessibility**: ARIA labels, keyboard navigation, and semantic HTML for better accessibility
- **Real-time GitHub Stats**: Automatically fetches and displays GitHub star counts for projects
- **Collapsible Sections**: Publications organized into expandable categories (arXiv, Conference, Journal papers)

## 📁 Project Structure

```
personal_website/
├── index.template.html # HTML template source
├── content-data.json   # Structured content data (news, projects, publications)
├── build.js            # Build script (render template and refresh stars)
├── index.html          # Generated main HTML file
├── style.css           # All styles (dark/light themes, responsive design)
├── app.js              # Client-side interactions (theme, nav, collapsibles, stars)
├── profile.jpg         # Profile photo
├── .gitignore          # Git ignore configuration
└── README.md           # Project documentation
```

## 🚀 Quick Start

### View Locally

Build the site first, then open `index.html` in your web browser:

```bash
node build.js
```

For local preview:

```bash
# For a simple local server (optional)
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

Or use any other local server:
- VS Code: Use the "Live Server" extension
- Node.js: `npx http-server`

### Deploy to GitHub Pages

1. **Create a new repository** on GitHub (e.g., `personal-website`)

2. **Initialize and push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Personal website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/personal-website.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Source", select `main` branch and `/root` folder
   - Click **Save**
   - Your site will be published at: `https://YOUR_USERNAME.github.io/personal-website/`

## 🎨 Customization

### Update Personal Information

Edit [index.html](index.html) to update:
- Name, title, and affiliation
- Contact information
- Social media links
- About section content
- Publications section content

Edit [content-data.json](content-data.json) to update:
- News list
- Project cards (name, repo, stars, description, status)
- Publications categories and paper items

### Change Profile Photo

Replace `profile.jpg` with your own photo (recommended size: 800x800px)

### Modify Theme Colors

Edit CSS variables in [style.css](style.css) (lines 4-44):
- `--color-primary`: Main accent color
- `--color-accent`: Secondary accent color
- Customize both dark and light theme colors

### Add/Remove Projects

Projects are defined in [content-data.json](content-data.json), rendered by [build.js](build.js), and enhanced in [app.js](app.js).

## 🛠️ Technologies Used

- **HTML5**: Semantic markup with ARIA accessibility
- **CSS3**: Custom properties, flexbox, grid, animations
- **Structured Content Data**: `content-data.json` centralizes News/Projects/Publications content
- **Vanilla JavaScript**: Centralized in `app.js` (theme switching, collapsibles, nav active state, GitHub stars integration)
- **GitHub Shields API**: Real-time star count fetching

## 📝 Key Sections

1. **About Me**: Professional background and current role
2. **Projects**: Key open-source projects with GitHub stats
3. **Publications**: Academic papers categorized by type (arXiv, Conference, Journal)

## 🌐 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 License

This project is open source and available for personal use. Feel free to fork and customize for your own personal website.

## 👤 Author

**Dr. Yi Liu**
- GitHub: [@aigcliu](https://github.com/aigcliu)
- Email: liuyi.ntu@gmail.com
- Google Scholar: [Profile](https://scholar.google.com/citations?user=d_wa7ogAAAAJ&hl=en)
- LinkedIn: [liuyi1990](https://www.linkedin.com/in/liuyi1990/)

---

Last updated: November 2025
