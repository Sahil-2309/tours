# Tour Package Automation - Frontend

React-based frontend for the Tour Package Automation system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Frontend will run on: http://localhost:3000

**Important:** Make sure backend is running on http://localhost:5000

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Main app with routing
│   ├── main.jsx                # Entry point
│   ├── index.css               # Global styles (Tailwind)
│   │
│   ├── components/             # Reusable components
│   │   └── Navbar.jsx          # Navigation bar
│   │
│   ├── pages/                  # Page components
│   │   ├── Templates.jsx       # Template CRUD
│   │   ├── WordPressSettings.jsx  # WP configuration
│   │   ├── ProcessExcel.jsx    # Upload & process
│   │   ├── Results.jsx         # Processing results
│   │   └── History.jsx         # Processing history
│   │
│   └── services/
│       └── api.js              # All API calls
│
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 🎯 Features

### 1. **Templates Page** (`/`)
- View all prompt templates
- Create new templates
- Edit existing templates
- Delete templates
- Preview template with variables

### 2. **WordPress Settings** (`/wordpress`)
- Configure WordPress site URL
- Save WordPress credentials
- Test connection
- View connection status

### 3. **Process Excel** (`/process`)
- Select template
- Upload Excel file
- Real-time processing progress
- Success/failed count
- Navigate to results

### 4. **Results** (`/results/:id`)
- Detailed processing summary
- Success/failed rows breakdown
- View error messages
- **Retry failed rows** with one click
- View WordPress post links

### 5. **History** (`/history`)
- View all past processing
- Filter by status
- Quick navigation to results

---

## 🔧 Configuration

### API Base URL

Located in `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Change this if backend is on different port/domain.

### Vite Proxy (Alternative)

Edit `vite.config.js` for proxy setup:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:5000'
  }
}
```

Then use relative URLs in API calls: `/api/templates` instead of `http://localhost:5000/api/templates`

---

## 🎨 Styling

Built with **Tailwind CSS** for:
- Responsive design
- Fast development
- Consistent UI
- Easy customization

### Customize Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
    }
  }
}
```

---

## 📡 API Integration

All API calls are centralized in `src/services/api.js`:

```javascript
// Template APIs
templateAPI.getAll()
templateAPI.create(data)
templateAPI.update(id, data)
templateAPI.delete(id)

// WordPress APIs
wordpressAPI.saveConfig(data)
wordpressAPI.testConnection(data)

// Process APIs
processAPI.processExcel(formData)
processAPI.getStatus(id)
processAPI.retryFailed(processId)
```

---

## 🔄 Workflow

### Complete User Flow:

1. **Create Template**
   - Go to Templates page
   - Click "Create Template"
   - Write prompt with variables like `{Duration}`, `{Meta Title}`
   - Save template

2. **Configure WordPress**
   - Go to WordPress Settings
   - Enter site URL, username, app password
   - Test connection
   - Save configuration

3. **Process Excel**
   - Go to Process Excel
   - Select template
   - Upload Excel file
   - Click "Start Processing"
   - Watch real-time progress

4. **View Results**
   - Automatically navigated or click "View Results"
   - See success/failed breakdown
   - Click "Retry" for failed rows
   - View WordPress post links

5. **Check History**
   - Go to History page
   - View all past processing
   - Click any process for details

---

## 🧪 Testing Locally

### Test Without Backend:

Mock API responses in `api.js`:

```javascript
export const templateAPI = {
  getAll: () => Promise.resolve({
    data: {
      success: true,
      data: [
        { _id: '1', name: 'Test', template: 'Hello {world}' }
      ]
    }
  }),
  // ... other methods
};
```

---

## 🐛 Common Issues

### Issue: CORS Error

**Symptom:** 
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
- Make sure backend has CORS enabled
- Check backend is running on port 5000
- Verify API_BASE_URL in `api.js`

### Issue: 404 Not Found

**Symptom:**
```
GET http://localhost:5000/api/templates 404
```

**Solution:**
- Backend not running
- Wrong API endpoint
- Check backend routes

### Issue: File Upload Fails

**Symptom:**
```
Only Excel files allowed
```

**Solution:**
- Upload .xlsx or .xls file only
- Check file is not corrupted
- File size under 10MB

---

## 📱 Responsive Design

Works on:
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

Tailwind breakpoints used:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

---

## 🚀 Production Build

### Build for Production:
```bash
npm run build
```

Output in `dist/` folder.

### Preview Production Build:
```bash
npm run preview
```

### Deploy Options:

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy
```

**Manual:**
- Upload `dist/` folder to server
- Configure web server (Nginx/Apache)

---

## 🎯 Next Steps

**After showing client:**

1. Add authentication
2. Add user roles
3. Improve error messages
4. Add loading skeletons
5. Add notifications (toast)
6. Add dark mode
7. Add file preview before upload
8. Add bulk template operations
9. Add export results to CSV
10. Add analytics dashboard

---

## 📞 Support

**Issues?**
- Check backend is running
- Check console for errors
- Verify API endpoints
- Test with Postman first

**Need Help?**
Contact: sahilarora@example.com

---

## 📄 License

MIT License - Feel free to use for your projects!
