# VenueOps ERP - Testing Guide

## 🧪 Testing Tools Overview

VenueOps ERP now includes comprehensive testing utilities to make it easy to test all features, generate sample data, and manage test scenarios.

---

## 🎯 Quick Access Buttons

You'll find **three floating buttons** at the bottom of the screen:

### 1. **Testing Tools** (Bottom Right - Purple)
- 🔬 Generate sample data
- 🗑️ Clear all data
- 💾 Export/Import backups
- 📊 View current statistics

### 2. **Data Inspector** (Bottom Left - Gray)
- 👁️ View all data in localStorage
- 📋 Copy data as JSON
- 🔍 Inspect venues, spaces, and layouts

---

## 📦 Data Generation Features

### **Full Sample Data Set**
Generates a complete, realistic dataset:
- ✅ 3 Venues (Lahore, Karachi locations)
- ✅ 8 Prime Spaces (Marquees, Halls, Lawns)
- ✅ 14 Sub Spaces (Divisible sections)
- ✅ 2 Layouts (Theatre, Round Tables)

**Use Case:** Perfect for comprehensive testing of the entire system

### **Minimal Test Data**
Generates a simple dataset:
- ✅ 1 Venue
- ✅ 1 Prime Space
- ✅ 1 Sub Space

**Use Case:** Quick testing of basic functionality

---

## 💾 Backup & Restore

### **Export Data Backup**
- Downloads all Master Setup data as JSON file
- File format: `venueops-backup-YYYY-MM-DD.json`
- Preserves all venues, spaces, layouts, and configuration

### **Import Data Backup**
- Restore previously exported data
- ⚠️ Warning: Replaces all current data
- Useful for sharing test scenarios

---

## 🔄 Testing Workflow

### **Recommended Testing Process:**

1. **Start Fresh**
   - Click "Testing Tools" → "Clear All Data"
   - Confirm deletion

2. **Load Sample Data**
   - Click "Generate Full Sample Data"
   - Wait for success message
   - Page will reload automatically

3. **Verify Data**
   - Click "Data Inspector" to view loaded data
   - Navigate to Master Setup modules to see venues/spaces

4. **Test Features**
   - Go to Event Availability Calendar
   - Check if venues appear in dropdowns
   - Try creating bookings with the new data

5. **Save Your Work**
   - Click "Export Data Backup" before clearing
   - Save the JSON file for future use

---

## 🎨 Sample Data Details

### **Venues Included:**

1. **Aiwan-e-Akbari Grand Banquet** (Lahore)
   - Type: Marquees & Halls
   - 3 Marquees + 2 Lawns
   - Capacity: 600-1200 guests per space

2. **Emerald Banquet Hall** (Lahore)
   - Type: Halls Only
   - 2 Halls
   - Capacity: 500-700 guests per hall

3. **Royal Garden Marquees** (Karachi)
   - Type: Marquees & Halls
   - 1 Large Marquee
   - Capacity: 1500 guests

### **Space Types:**
- **Marquees:** Grand Marquee 1, Crystal Marquee 2, Royal Marquee 3
- **Lawns:** Garden Lawn 1, Premium Lawn 2
- **Halls:** Emerald Hall A, Emerald Hall B

---

## 🐛 Troubleshooting

### **Data Not Appearing After Generation?**
- Refresh the page manually (F5)
- Check Data Inspector to verify data was saved
- Try clearing browser cache and regenerating

### **Calendar Not Showing New Venues?**
- Ensure you refreshed after generating data
- Check if venues are marked as "Active" in Master Setup
- Verify venue IDs match in Data Inspector

### **Export/Import Not Working?**
- Check browser permissions for downloads
- For import, ensure JSON file is valid
- Try exporting first to see the correct format

---

## 📊 Current Data Statistics

The "Current Data" tab shows:
- **Venues:** Total number of active venues
- **Prime Spaces:** Total halls, marquees, lawns
- **Sub Spaces:** Total divisible sections
- **Layouts:** Total seating arrangements

**Empty State:**
If all counts are 0, use Data Generation to populate the system.

---

## 🔒 Safety Features

### **Confirmation Dialogs:**
- ⚠️ Clear All Data requires confirmation
- ⚠️ Import Data shows warning before replacing
- ✅ All actions show success/error messages

### **Auto-Reload:**
- System automatically refreshes after data changes
- Ensures calendar and modules load updated data
- Prevents stale data issues

---

## 💡 Pro Tips

1. **Save Before Testing:** Always export data before major testing
2. **Name Your Exports:** Rename backup files with descriptions (e.g., `test-scenario-1.json`)
3. **Quick Reset:** Use Minimal Data for rapid iteration
4. **Inspect Often:** Use Data Inspector to verify changes
5. **Browser DevTools:** Open console (F12) to see detailed logs

---

## 🚀 Advanced Testing Scenarios

### **Scenario 1: Multi-Venue Setup**
```
1. Generate Full Sample Data
2. Navigate to Event Calendar
3. Test filtering by venue
4. Create bookings for different venues
```

### **Scenario 2: Sub-Space Booking Logic**
```
1. Generate Full Sample Data
2. Go to Calendar → Select Grand Marquee 1
3. Book entire Prime Space for lunch
4. Try booking Sub Space for dinner (should work)
5. Try booking Prime Space for dinner (should be blocked)
```

### **Scenario 3: Data Migration**
```
1. Generate Full Sample Data
2. Export backup
3. Clear All Data
4. Import backup
5. Verify all data restored correctly
```

---

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for errors (F12)
2. Verify localStorage has data (Data Inspector)
3. Try clearing browser cache and regenerating
4. Check if Master Setup modules show the data

---

**Happy Testing! 🎉**

*Last Updated: January 10, 2026*
