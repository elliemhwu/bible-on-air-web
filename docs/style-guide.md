# Bible On Air 樣式規範

前台（reader）與後台（Studio）共用這份規範。目標有兩個：**所有顏色都從同一個地方來**，以及**同一種東西長得一樣、用同一個元件**，而不是每一頁各自用 Tailwind 重寫。

`yarn lint:styles`（CI 也會跑）會自動檢查顏色規則；其他規則靠 code review。

---

## 1. 顏色

### 三層結構

```
app/styles/colors.css        原色：唯一寫色碼的地方（pebble、iris、navy、gold、sage、crimson、night、print…）
        │
        ├─ app/globals.css    前台語意：primary、danger、warning、background、foreground
        └─ app/styles/studio.css  後台語意：st-*（晴空），.studio-night 換成墨夜
        │
components / pages            只用上面兩層的 class 或 var(--color-*)
```

### 規則

1. **色碼只能寫在 `app/styles/colors.css`。** 其他檔案不能出現 `#xxxxxx`、`rgb()`、`hsl()`、`oklch()`，也不能用 `bg-[#...]` 這種任意值。
2. **不用 Tailwind 內建色階**（`gray-*`、`red-*`、`blue-*`、`amber-*`…）。需要的顏色先加進 `colors.css`，或用語意 token。
3. **前台元件**用 `pebble-*`（中性色）、`primary`、`primary-soft`、`primary-hard`、`danger`、`warning`。紫色只有三種：文字、按鈕、連結一律 `primary`；經文內文這種大段的紫色字用深一階的 `primary-hard`；裝飾性的淺紫（經文左側直線、卡片 hover 邊框）用 `primary-soft`。不直接寫 `iris-*` 的深淺（`lint:styles` 會擋）。
   - 連結用 `TextLink`：邀請讀者去做的事用 `primary`，「回到…」這種退路用 `muted`。文章內文（`.prose-tc`）的連結也是 `primary` 加底線。
   - 勾選框、日期選擇器等原生控制項的顏色由 `accent-color` 統一設定（前台 `primary`、後台 `st-accent`），元件不用再各自加 `accent-*`。
4. **後台元件只用 `st-*`**（`lint:styles` 會檢查 `components/studio`、`app/(studio)`）（`bg-st-surface`、`text-st-muted`、`border-st-line`…），這樣深色寫作主題（墨夜）才會跟著切換。錯誤用 `st-danger`、提醒用 `st-gold-ink`，不用前台的 `danger`、`warning`：墨夜主題裡深紅字看不清楚。
5. `white`、`black` 也定義在 `colors.css`，可以直接用：例如封面圖上的白字、`bg-black/30` 的遮罩。
6. 狀態用語意 token，不用直接選色：錯誤訊息用 `text-danger`，提醒用 `text-warning`，已發布等狀態用 `StatusBadge`。

### 要加新顏色時

1. 先看看現有的色階和 token 夠不夠用，通常是夠的。
2. 真的需要的話，在 `colors.css` 對應的色階加一階，或新增一個色階（命名用顏色名＋數字，數字越大越深）。
3. 如果是「某種用途」的顏色（例如新的狀態），在 `globals.css` 或 `studio.css` 加一個語意 token 指向它，元件用 token。

### 色票

| 色階 | 用在 |
| --- | --- |
| `pebble` | 前台中性色：背景、內文、分隔線。帶一點紫的冷灰，和 iris 同一個色系 |
| `iris` | 前台主色：`primary` = iris-500（日期、小標、經文、按鈕、連結），`primary-soft` = iris-300（裝飾），`primary-hard` = iris-600（經文內文） |
| `navy` | 後台晴空主題的中性色、文字與強調色 |
| `gold` | 後台的提醒、標記，以及墨夜主題的主色 |
| `sage` | 成功、已發布 |
| `crimson` | 錯誤、刪除（`danger`） |
| `night` | 後台墨夜主題的中性色 |
| `print` | 列印頁的墨色和分隔線 |
| `juniper`、`zinnia`、`poppy`、`marigold` | 目前沒有使用（juniper 的 200–900 還是同一個值，要用之前先補齊） |

---

## 2. 字型

| 字型 | 用在 |
| --- | --- |
| Serif（Noto Serif TC） | **經文**、文章標題、Logo、Studio 頁面的大標題 |
| Sans（Noto Sans TC） | 介面（導覽、按鈕、表單、標籤）、**前台的問題與靈修內文**、後台預設 |

- 經文用正體明體，不用斜體；靠 iris 顏色和左側直線和內文區分。
- 後台由 `app/(studio)/layout.tsx` 統一設成 sans，元件不用再各自加 `font-sans`。
- 列印頁（`/studio/print`）有自己的 A4 字型設定（`app/styles/print.css`）。

---

## 3. 元件優先

**頁面負責排版，元件負責長相。** 頁面裡的 Tailwind 主要寫排版（`flex`、`grid`、`gap`、`p-*`、`w-*`、斷點）；顏色、邊框、圓角、陰影、字級、按鈕和輸入框的尺寸，應該來自共用元件或 `lib/styles.ts`。

- **第二次寫出一樣的樣式，就把它抽出來。** 第一次可以寫在頁面裡，第二次就抽成元件或 `lib/styles.ts` 的常數。
- 新的、前後台都用得到的基本元件放 `components/ui/`；品牌相關放 `components/brand/`；只有一邊用的放 `components/reader/` 或 `components/studio/`。
- 改一個共用元件的外觀，就是改所有地方的外觀。這是我們要的效果：不要為了某一頁覆寫共用元件的顏色或圓角，需要不同版本就加一個 `variant`／`tone` prop。

### 現有的共用元件

| 元件 | 位置 | 用途 |
| --- | --- | --- |
| `Logo` | `components/brand/Logo.tsx` | Bible On Air 文字 Logo；`tone="reader" \| "studio"`，字型大小一致，只有顏色不同 |
| `MonthCalendar` | `components/calendar/MonthCalendar.tsx` | 月曆：桌機是封面格子，手機是卡片列表；`variant="reader" \| "studio"` |
| `StatusBadge` | `components/studio/StatusBadge.tsx` | 文章狀態標籤 |
| `StudioPage` | `components/studio/shell/StudioHeader.tsx` | 後台頁面外框（色票、header） |
| `SectionHeading` | `components/reader/SectionHeading.tsx` | 文章各段小標（經文、觀察與思想…），第一個字後面有對比色的墨漬圓點（`--color-ink-dot`） |
| `StaffFabProvider`、`StaffEditTarget` | `components/reader/StaffFab.tsx` | 前台的同工鉛筆選單 |
| `ChevronDown` | `components/icons/ChevronDown.tsx` | 下拉箭頭 |
| `Button`、`Input`、`Field`、`TextLink` | `components/ui/` | 前台的按鈕、輸入框、標籤＋輸入框、連結（登入、密碼、404 頁在用） |
| `stBtnPrimary`、`stBtnSecondary`、`stBtnGold`、`stBtnGhost`、`stCard`、`stInput`、`stSegment`、`stSegmentItem` | `lib/styles.ts` | 後台的按鈕、卡片、輸入框、分段切換 |

### 尺寸

| | 規則 |
| --- | --- |
| 圓角 | 按鈕、輸入框 `rounded-lg`（後台按鈕 `rounded-[10px]`，在 `lib/styles.ts` 裡）；卡片 `stCard`（14px）；標籤、頭像、FAB `rounded-full` |
| 陰影 | 只用在浮起來的東西：選單、彈出視窗 `shadow-lg`；一般卡片不加陰影，用邊框 |
| 按鈕高度 | 後台一般按鈕 `h-9`，小按鈕 `h-8` |

### 圖示

- 新的圖示做成元件放 `components/icons/`，用 `currentColor`，大小由外層的 class 決定。
- 不要用 emoji 當圖示。現有的文字符號（`‹ › ⠿ × ✎`）之後會逐步換成圖示元件。

---

## 4. 文案

- 中文用全形標點；按鈕用動詞開頭（「新增文章」「儲存」），不加句號。
- 空狀態寫成邀請，不是道歉：「先把同工加進名單，就能依序自動填入。」
- 錯誤訊息說發生什麼、可以怎麼做：「儲存失敗，請再試一次」。

---

## 5. 待整理（已知的不一致）

這些是規範訂下之前就存在的地方，改到相關頁面時順手整理：

- [x] **後台仍在用前台色票的檔案**：都改成 `st-*` 了；`yarn lint:styles` 現在會擋下 `components/studio`、`app/(studio)` 裡的 `pebble-*`、`iris-*`、`*-primary`。新增、編輯、校閱文章頁也套上了 `StudioPage` 外框
- [x] **前台的登入、密碼表單**：改用 `components/ui` 的 `Button`、`Input`、`Field`、`TextLink`
- [ ] **大約 120 個手寫的 `<button>`**：逐步改用共用的 `Button`
- [ ] **文字符號當圖示**（`‹ › ⠿ × ✎`）：換成 `components/icons/`
- [ ] **`colors.css` 裡沒用到的色階**（`juniper`、`zinnia`、`poppy`、`marigold`）：決定要留還是刪
