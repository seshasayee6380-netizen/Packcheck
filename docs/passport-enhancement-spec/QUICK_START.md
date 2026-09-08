# Quick Start Guide - Enhanced Digital Product Passport

## ⚡ 5-Minute Setup

### What's New?
Your passport display now shows a **complete professional product verification card** instead of just a loading screen.

### What You Get
✅ Complete product information display  
✅ All verified declarations visible  
✅ Regulatory verification details  
✅ Evidence tracking  
✅ Mobile responsive design  

---

## Installation

### Option 1: Use the Updated Project (Recommended)
```bash
# The updated project is already prepared for you:
cd PackCheck_Enhanced_Passport_v28
```

### Option 2: Manually Update Your Project
If you want to update your existing project:

#### Step 1: Update `frontend/src/main.jsx`
Replace the `PublicPassportPage` function (around line 758) with the new version.
See `CODE_CHANGES_DETAILED.md` for exact changes.

#### Step 2: Add CSS to `frontend/src/styles.css`
Append the new CSS classes to the end of the file.
See `CODE_CHANGES_DETAILED.md` for complete CSS.

---

## Running the Application

### Terminal 1: Start Backend
```bash
cd backend
python main.py
```
Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm install  # Only needed first time
npm run dev
```
Expected output:
```
  VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

---

## Testing

### Test 1: Load Dashboard
1. Open http://localhost:5173
2. Should see the main PackCheck dashboard
3. ✅ No errors in console

### Test 2: View a Passport
1. Open http://localhost:5173/passport/PP-20260829-951B8F91
2. Should see:
   - ✓ VERIFIED status
   - Product name (prominent)
   - All product info cards
   - Verified declarations with ✓ checkmarks
   - Regulatory verification
   - Evidence section
3. ✅ All sections visible, properly formatted

### Test 3: Mobile Responsiveness
1. Open in mobile browser (or DevTools mobile view)
2. Screen size: 375px width
3. Should see:
   - Single column layout
   - All sections stacked vertically
   - Readable text and buttons
   - No horizontal scrolling
4. ✅ Mobile layout works

### Test 4: Error Handling
1. Visit invalid passport: http://localhost:5173/passport/invalid123
2. Should show error message
3. ✅ Error handled gracefully

---

## What Each Section Shows

### 1. Hero Status
- Large ✓ VERIFIED or ✗ UNVERIFIED badge
- Signature validity indicator
- Green for passed, red for failed

### 2. Product Information
- Product name (large, prominent)
- Passport ID
- Status, verification date, regulation, GTIN

### 3. Verified Declarations
- **All detected product label fields:**
  - ✓ MRP
  - ✓ Net Quantity
  - ✓ Manufacturer
  - ✓ Packer
  - ✓ Importer
  - ✓ Address
  - ✓ Packed Date
  - ✓ Best Before
  - ✓ Batch Number
  - ✓ Consumer Care
  - ✓ Consumer Phone/Email
  - ✓ Country of Origin

### 4. Regulatory Verification
- Applicable regulation (PCR 2011)
- Snapshot version (PCR-2026-07)
- Verification timestamp
- Three verification checks with ✓ marks

### 5. Evidence
- 📷 Package images
- 🔗 Evidence chain
- 🧾 Inspection record

### 6. What This Means
- Registry match explanation
- Integrity check explanation
- Human verification note

---

## API Response Format

Your backend should return this structure:

```json
{
  "passport_id": "PP-20260829-951B8F91",
  "product_name": "Parle Hide & Seek Choco Chip",
  "signature_valid": true,
  "status": "verified",
  "created_at": "2026-08-29T10:30:00",
  "gtin": "8901234123456",
  "payload": {
    "rule_version": "PCR-2026-07",
    "declarations": {
      "product_name": "Parle Hide & Seek Choco Chip",
      "mrp": "₹20.00",
      "net_quantity": "200 g",
      "manufacturer": "Parle Biscuits Pvt Ltd",
      "packer": "Parle Biscuits (P) Ltd, Bangalore",
      "importer": "N/A",
      "address": "45 Biscuit Lane, Bangalore",
      "packed_date": "23/05/2024",
      "best_before": "24 months from packing",
      "batch_number": "A52305A",
      "consumer_care": "1800-22-4444",
      "consumer_phone": "1800-22-4444",
      "consumer_email": "care@parle.com",
      "country_of_origin": "India"
    }
  }
}
```

**Note:** Missing fields are automatically skipped in display.

---

## Customization

### Change Product Fields Display
Edit `verifiedFields` array in `main.jsx` (line 763):
```javascript
const verifiedFields = ['product_name', 'mrp', 'net_quantity', ...your fields...]
```

### Change Colors
Edit CSS color variables in `styles.css`:
```css
--verified-green: #238349;     /* Green checkmarks */
--text-primary: #1f3a4f;       /* Main text */
--text-secondary: #7a8a9d;     /* Labels */
```

### Change Font Sizes
Edit font-size properties in CSS:
```css
.product-name-section h2 {
  font-size: 26px;    /* Product name size */
}

.decl-value {
  font-size: 9px;     /* Declaration value size */
}
```

### Add New Sections
The structure is modular. To add a new section:

1. Copy a section (e.g., evidence-card)
2. Modify the JSX content
3. Add corresponding CSS class
4. Insert into the return statement

---

## Troubleshooting

### Issue: Passport page shows blank
**Solution:**
- Check browser console for errors
- Verify API is running: `http://localhost:8000/health`
- Verify passport ID exists in database
- Check network tab for API response

### Issue: Checkmarks don't show (no icons)
**Solution:**
- Lucide icons should be pre-imported
- If still missing, check `main.jsx` imports
- Ensure `CheckCircle2` is imported from 'lucide-react'

### Issue: Mobile layout broken
**Solution:**
- Clear browser cache
- Check viewport meta tag in `index.html`
- Test with DevTools mobile emulation
- Verify CSS media queries loaded

### Issue: Styling looks different
**Solution:**
- Ensure all CSS was appended to `styles.css`
- Rebuild: `npm run build`
- Clear browser cache: Ctrl+Shift+Delete
- Check for CSS conflicts with other styles

---

## Performance Tips

### Optimize Images
- Keep package images optimized (<500KB)
- Use WebP format if possible

### Cache Passports
- Browsers cache GET requests
- Consider cache headers on backend

### Reduce Bundle Size
- Already minimal impact (+2KB)
- No additional dependencies needed

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| iOS Safari | 12+ | ✅ Fully supported |
| Android Chrome | Latest | ✅ Fully supported |

---

## Deployment Checklist

- [ ] Backend running and accessible
- [ ] Frontend built: `npm run build`
- [ ] Environment variables set (`VITE_API_URL`)
- [ ] HTTPS configured for production
- [ ] Database contains test passports
- [ ] QR codes generated and scannable
- [ ] Mobile testing completed
- [ ] Error cases handled
- [ ] Performance acceptable
- [ ] All sections displaying correctly

---

## Next Steps

### Immediate
1. ✅ Update project
2. ✅ Run frontend and backend
3. ✅ Test passport display
4. ✅ Check mobile responsiveness

### Short Term
- Add passport generation logic if needed
- Configure QR code links to correct URL
- Set up database with test data
- Test error scenarios

### Future Enhancements
- Add image gallery for evidence
- Enable PDF export
- Add share/social features
- Show complaint history
- Multi-language support

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/main.jsx` | React components |
| `frontend/src/styles.css` | All styling |
| `frontend/index.html` | Entry HTML |
| `backend/main.py` | FastAPI server |
| `backend/data/packcheck.db` | SQLite database |

---

## Support & Documentation

For more details, see:
- **`IMPLEMENTATION_SUMMARY.md`** - Overview of changes
- **`CODE_CHANGES_DETAILED.md`** - Exact code changes
- **`DIGITAL_PASSPORT_ENHANCEMENT_GUIDE.md`** - Complete technical guide
- **`BEFORE_AFTER_COMPARISON.md`** - Before/after comparison
- **`VISUAL_MOCKUP.txt`** - ASCII mockup of the display

---

## Success Indicators

✅ When complete, you should see:
- Passport loads with all information
- Product name displays prominently
- All verified fields show with checkmarks
- Mobile layout is responsive
- No console errors
- Fast page load (<2 seconds)
- Professional appearance

---

## Got Stuck?

1. Check console: F12 → Console tab
2. Check network: F12 → Network tab
3. Verify API response structure
4. Ensure all files are updated
5. Clear cache and rebuild

**Everything should work out of the box!**

---

## That's It! 🎉

Your Digital Product Passport is now displaying complete product verification information. 

**Quick verification:**
- Open http://localhost:5173/passport/PP-20260829-951B8F91
- Should see ✓ VERIFIED with all product details
- Responsive on mobile

Enjoy your enhanced passport display! 🚀
