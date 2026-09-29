# DESIGN.md — 9Drive (Google Drive Clone Design System)

## 1. Design Identity & Philosophy

9Drive is designed as an exact, faithful clone of **Google Drive (Google Workspace / Material Design 3)**.
The user experience must feel identical to native Google Drive: clean, utilitarian, fast, highly legible, and free of generic AI visual tropes (no random purple-blue gradients, no neon glow, no decorative floating orbs, and no excessive frosted glass).

- **Design Paradigm:** Google Material Design 3 (Material You) for Desktop & Web.
- **Default Appearance:** Crisp Light Mode (Google Workspace default). Clean neutral surfaces with intentional Google brand accents.
- **Atmosphere:** Professional, organized, trustworthy cloud storage.

---

## 2. Color Palette & Tokens

### Surfaces & Backgrounds
| Token / Role | Hex / Class | Description |
| :--- | :--- | :--- |
| **App Canvas Background** | `#F8FAFD` (`bg-[#f8fafd]`) | The soft cool-gray canvas behind all Google Drive containers |
| **Main Surface / Container** | `#FFFFFF` (`bg-white`) | Active content card, file explorer container, white dialogs |
| **Sidebar Surface** | `#F8FAFD` / Transparent | Blends into the app canvas with active item pills |
| **Search Bar Surface** | `#EDF2FC` (`bg-[#edf2fc]`) | Material 3 search pill background |
| **Search Bar Focus** | `#FFFFFF` (`bg-white shadow-md`) | Expands with shadow on focus |
| **Hover Surface** | `#F0F4F9` / `#E9EEF6` | Subtle neutral hover highlight for rows and list items |
| **Selected Item Container** | `#C2E7FF` (`bg-[#c2e7ff]`) | Google M3 secondary container for active navigation/selected files |

### Brand & Interactive Colors
| Token / Role | Hex | Description |
| :--- | :--- | :--- |
| **Primary Accent (Google Blue)** | `#0B57D0` / `#1A73E8` | Primary buttons, active icons, links, focus rings |
| **Active Selection Text** | `#001D35` | Dark navy text inside `#C2E7FF` selected containers |
| **Primary Text** | `#1F1F1F` | High-emphasis body text, titles, file names |
| **Secondary Text** | `#444746` | Metadata, file size, timestamps, inactive icons |
| **Border / Divider** | `#E0E3E7` / `#E1E3E1` | Subtle divider lines between panels and table headers |
| **Focus Ring** | `#0B57D0` (2px solid) | Accessible keyboard focus state |

### File Type Accent Colors (Google Drive Standard)
- **Folder Icon:** Google Gray `#5F6368` or Google Blue `#1A73E8`
- **Google Docs / Text:** Blue `#4285F4` (`#1A73E8`)
- **Google Sheets / Excel:** Green `#0F9D58` (`#1E8E3E`)
- **Google Slides / Presentation:** Yellow `#F4B400` (`#F9AB00`)
- **PDF / Document:** Red `#EA4335` (`#D93025`)
- **Images / Video:** Red `#EA4335` or Purple `#7248B9`
- **Archives / ZIP:** Slate `#5F6368`

---

## 3. Typography & Hierarchy

- **Font Family:** `Google Sans`, `Roboto`, system-ui, -apple-system, sans-serif.
- **Rendering:** Anti-aliased, crisp rendering.

| Style | Size / Line-height | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **App Title** | 22px / 28px | 400 (Google Sans) | Top-left "9Drive" logo label |
| **Section Heading** | 16px / 24px | 500 (Medium) | "Suggested", "Folders", "Files" |
| **Navigation Item** | 14px / 20px | 500 (Medium) | Left sidebar navigation links |
| **Table Header** | 13px / 18px | 500 (Medium) | Table columns ("Name", "Owner", "Last modified") |
| **Body / File Name** | 14px / 20px | 400 (Regular) | File titles and standard items |
| **Caption / Metadata** | 12px / 16px | 400 (Regular) | File size, date, secondary stats |

---

## 4. Layout Architecture (Google Drive Shell)

The viewport is divided into three fixed zones:

```
+---------------------------------------------------------------------------------------+
|  [Logo: 9Drive]         [  🔍 Search in Drive                             ]  [⚙️] [👤]  |  Header (64px)
+-------------------+---------------------------------------------------+---------------+
|  [ + New ]        |  My Drive > Subfolder                                             |  Breadcrumbs & Actions
|                   |  [Type ▾] [People ▾] [Modified ▾]             [ 𝄜 List / ⊞ Grid ] |  Filter Chips
|  📁 My Drive      +-------------------------------------------------------------------+
|  👥 Shared with me|  Folders                                                          |
|  🕒 Recent        |  [ 📁 Documents ]   [ 📁 Projects ]   [ 📁 Photos ]               |  Folders Grid
|  ⭐ Starred       +-------------------------------------------------------------------+
|  🗑️ Trash         |  Files (Table / Grid)                                             |
|                   |  Name                  Owner      Last modified       Size   ...  |  Main Files Area
|  ---------------- |  📄 Resume.pdf         me         Sep 28, 2026        2.4 MB ...  |
|  ☁️ Storage       |  📊 Budget.xlsx        me         Sep 25, 2026        450 KB ...  |
|  [====    ] 45%   |                                                                   |
+-------------------+-------------------------------------------------------------------+
```

### 1. Top Header (`h-16`, 64px)
- **Left:** Hamburger toggle button + 9Drive triangular cloud logo + "9Drive" text in 22px regular.
- **Center:** Wide search container (max-w-2xl, `h-12`, `rounded-full`, bg `#EDF2FC`).
  - Leading search icon (`#444746`).
  - Input: placeholder `"Search in Drive"`, borderless, outline-none.
  - Trailing search options filter icon.
- **Right:** Help icon, Settings cogwheel (`#444746`), Profile avatar circle.

### 2. Left Sidebar (`w-64`, 256px)
- **Floating "+ New" Button:**
  - Styled as an elevated Material FAB/Pill (`rounded-2xl` or `rounded-full`, `h-14`, px-6, bg-white, shadow-md, hover:shadow-lg).
  - Plus icon (Google multi-color or Google Blue) + "New" label in 14px medium.
  - Triggers dropdown: "New folder", "File upload", "Folder upload".
- **Navigation Links:**
  - Items: "Home", "My Drive", "Computers", "Shared with me", "Recent", "Starred", "Spam", "Trash".
  - **Inactive state:** `h-10`, `rounded-full`, px-4, text `#444746`, hover: `bg-[#F0F4F9]`.
  - **Active state:** `h-10`, `rounded-full`, px-4, `bg-[#C2E7FF]`, text `#001D35`, font-medium.
- **Storage Section:**
  - Cloud storage icon, linear progress bar (blue fill on `#E0E3E7`), text: `"X GB of Y GB used"`, "Get more storage" link.

### 3. Main File Explorer
- **Container:** Wrapped in a large rounded white card (`rounded-2xl`, `bg-white`, shadow-sm, `p-6` or `p-4`) on top of `#F8FAFD`.
- **Breadcrumbs:** Clean path navigation (`My Drive > 2026 > Q3`) with chevron separators and dropdown options.
- **Toolbar:** Filter chips (`rounded-lg`, border, px-3, py-1.5, text-13px) + View switcher (`lucide-list` vs `lucide-layout-grid`) + Info toggle (`lucide-info`).
- **Folder Section:** Clean cards with folder icon + name + 3-dots menu button on hover.
- **Files Section:**
  - **List View:** Table format with sticky header. Rows highlight with `#F0F4F9` on hover, `#C2E7FF` when selected.
  - **Grid View:** Preview cards with thumbnail preview / large file icon, footer with file name, file icon, and 3-dots menu.

---

## 5. Components & UI Primitives

### Buttons
- **Primary ("Google Blue"):** `bg-[#0B57D0]`, text-white, `rounded-full`, `h-10`, px-6, hover: `bg-[#0842A0]`, active: `bg-[#063175]`.
- **Tonal / Secondary:** `bg-[#C2E7FF]`, text-[#001D35], `rounded-full`, hover: `bg-[#B3DCF5]`.
- **Outlined:** border `border-[#747775]`, text-[#0B57D0], `rounded-full`, hover: `bg-[#F0F4F9]`.
- **Text / Icon Button:** `rounded-full`, `w-10 h-10`, p-2, hover: `bg-[#1F1F1F0F]` (`hover:bg-black/5`).

### Modals & Dialogs
- **Backdrop:** `bg-black/32` (Google standard subtle scrim).
- **Surface:** `bg-white`, `rounded-[28px]` (Material 3 extra-large radius), `shadow-2xl`, padding `p-6`.
- **Header:** Clean 20px/24px title with close icon button on right.
- **Actions:** Right-aligned button bar with "Cancel" (text button) and "Done" / "Save" (filled Google Blue button).

### Context Menus & Popovers
- Surface: `bg-white`, `rounded-xl`, border `border-[#E0E3E7]`, shadow-lg.
- Item: `h-9`, px-3, text-13px, flex items-center gap-3, `hover:bg-[#F0F4F9]`, text-[#1F1F1F].

---

## 6. Anti-Slop Enforcement Rules

1. **NO AI Blue-Purple Gradients:** All primary actions use Google Blue `#0B57D0` or solid M3 containers. Never use cyan-to-purple or pink-to-blue gradients.
2. **NO Random Dark Mode:** The canonical interface is Google Workspace Light (`#F8FAFD` canvas + `#FFFFFF` surfaces). Dark mode is strictly Google Material Dark (slate `#1F1F1F`, not pure pitch black with saturated neon).
3. **NO Excessive Pill Everything:**
   - Buttons, search bar, and active nav items use `rounded-full`.
   - Modals use `rounded-[28px]`.
   - Table rows, folder cards, and menus use `rounded-xl` / `rounded-lg`.
4. **NO Soft Floating Shadows Everywhere:** Only floating buttons ("+ New"), open dropdowns, and dialogs carry shadows. Table rows and folder cards sit flat or have hairline borders (`#E0E3E7`).
5. **NO Glassmorphism Everywhere:** Surfaces are clean, opaque Material surfaces (`#FFFFFF` and `#F8FAFD`). Backdrop blur is restricted strictly to the modal scrim or mobile topbar blur if needed.
