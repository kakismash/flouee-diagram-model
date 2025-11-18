# 📝 Changelog

All notable changes to Flouee Diagram Model will be documented in this file.

## [Unreleased]

### 🐛 Fixed
- **Angular Material Table Template Error**: Fixed `Cannot read properties of undefined (reading 'template')` error in Table View
  - Added `*matHeaderCellDef` directive to all regular column headers in `table-body.component.ts`
  - Refactored `table-header.component.ts` to remove `<th>` wrapper (Angular Material manages it)
  - Implemented reactive column filtering using `@ViewChildren(MatColumnDef)` and signals
  - `displayedColumns` now only includes columns with available `MatColumnDef` in DOM
  - Prevents rendering errors when columns are still being initialized

### 🔧 Changed
- **NotificationService**: Removed all `requestAnimationFrame` loops and complex timer management
  - Simplified to use single `effect()` that reacts to `notifications` signal changes
  - Eliminated `expirationTimers` Map and `scheduleExpirationCheck` methods
  - Code reduced from 247 lines to 184 lines, more maintainable and efficient

### 📝 Documentation
- Updated `docs/TABLE_VIEW.md` with troubleshooting section for Angular Material Table errors
- Documented the column header structure requirements and reactive filtering implementation

---

## [3.1.0] - 2025-01-29

### 🚀 Major Refactor: Synchronous Architecture

#### ✅ Added
- **Synchronous schema synchronization**: All changes applied atomically to Master and Slave
- **Fail-fast architecture**: If Slave fails, Master is not updated (consistency guaranteed)
- **Change validation system**: Automatic validation and normalization of schema changes
- **Slave configuration management**: Dynamic configuration from `deployment_configs` table
- **SQL generation helpers**: Modular SQL generation with proper IF NOT EXISTS handling
- **Schema changes history**: New method `getSchemaChangesHistory()` for audit trail
- **Architecture documentation**: 
  - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Complete architecture overview
  - [SYNC_ARCHITECTURE.md](./docs/SYNC_ARCHITECTURE.md) - Technical deep dive

#### 🔧 Changed
- **BREAKING**: Removed async event-driven system, replaced with synchronous flow
- `apply-schema-change-atomic`: Now applies changes synchronously to Slave FIRST, then Master
- Frontend methods (`createTable`, `deleteTable`, `updateRelationship`, etc.): Now use `applySchemaChange()` directly
- Edge Function flow: Validates → Locks → Applies to Slave → Updates Master → Logs
- Error handling: Improved with rollback on any failure

#### 🗑️ Removed
- ❌ **`process-events` Edge Function**: No longer needed (async system removed)
- ❌ **Event subscription methods**: `subscribeToEventUpdates()`, `unsubscribeFromEventUpdates()`
- ❌ **Event status methods**: `getEventStatus()` (replaced with `getSchemaChangesHistory()`)
- ❌ **Test scripts**: `test-events.ps1`, `test-event-*.js` (4 files removed)
- ❌ **Deprecated methods**: `applySchemaToSlave()`, `triggerEventProcessing()`
- ❌ **RealtimeCollaborationService dependency**: Removed from EventDrivenSchemaService

#### 🎯 Improvements
- **Simplicity**: Single endpoint, linear flow, easier debugging
- **Reliability**: Atomic operations guarantee consistency
- **Performance**: No overhead from async event processing
- **Code quality**: Cleaner, more maintainable code structure
- **Documentation**: Complete architecture documentation added

#### 📝 Code Changes
- Refactored `apply-schema-change-atomic/index.ts` with modular helper functions
- Simplified `EventDrivenSchemaService` removing async event dependencies
- Added change validation and normalization helpers
- Improved error messages and logging

---

## [3.0.0] - 2025-10-27

### 🎉 Major Release - Production Ready

#### ✅ Added
- Complete Master-Slave architecture implementation
- Automatic schema synchronization
- ID-based naming system (t_xxx, c_xxx)
- Row Level Security (RLS) implementation
- Role-based access control (admin, org_admin, client)
- Real-time collaboration with optimistic locking
- Automatic rollback on failed changes
- Comprehensive testing suite (15 E2E tests)
- Utility scripts for Slave management
- Complete documentation overhaul

#### 🔧 Changed
- **BREAKING**: Migrated from single-project to Master-Slave architecture
- **BREAKING**: Changed table naming from user-defined to ID-based
- **BREAKING**: Implemented organization-based data isolation
- Updated all Edge Functions to use new architecture
- Refactored frontend to support multi-tenant system
- Optimized database queries for better performance

#### 🗑️ Removed
- Legacy single-project architecture
- Obsolete Edge Functions (10 functions removed)
- Unused scripts and documentation
- Dead code and unused dependencies
- Outdated configuration files

#### 🔒 Security
- Implemented Row Level Security on all tables
- Added JWT-based authentication
- Organization-based data isolation
- Secure Edge Function deployment
- RBAC (Role-Based Access Control)

#### 🚀 Performance
- Reduced Edge Functions from 14 to 4 essential functions
- Optimized database queries
- Improved frontend rendering
- Faster schema synchronization
- Better error handling and rollback

#### 📚 Documentation
- Complete documentation rewrite
- Updated README.md with current architecture
- Created START_HERE.md for quick setup
- Added SYSTEM_READY.md for production status
- Cleaned up docs/ folder structure

## [2.0.0] - 2025-10-19

### 🔄 Architecture Migration

#### ✅ Added
- Master-Slave project separation
- Organization management system
- User role system
- Deployment configuration management
- Schema change audit logging

#### 🔧 Changed
- Migrated from single Supabase project to Master-Slave
- Updated authentication flow
- Changed data storage strategy

## [1.0.0] - 2025-01-12

### 🎉 Initial Release

#### ✅ Added
- Basic diagram editor
- Table creation and management
- Column type support
- Basic relationship management
- Supabase integration
- Angular frontend

---

## 🏗️ Architecture Evolution

### **v1.0.0 - Single Project**
- Single Supabase project
- Basic CRUD operations
- Simple table management

### **v2.0.0 - Master-Slave Introduction**
- Separated Master and Slave projects
- Added organization management
- Implemented basic multi-tenancy

### **v3.0.0 - Production Ready**
- Complete Master-Slave architecture
- Full multi-tenant support
- Advanced security (RLS)
- Real-time collaboration
- Comprehensive testing
- Production-ready deployment

---

## 🔮 Future Roadmap

### **v3.1.0 - Performance Optimization**
- Database query optimization
- Caching implementation
- CDN integration
- Advanced monitoring

### **v3.2.0 - Advanced Features**
- Custom column types
- Advanced relationship types
- Schema templates
- Import/export functionality

### **v4.0.0 - Enterprise Features**
- Multi-region deployment
- Advanced analytics
- Custom branding
- Enterprise SSO

---

## 📊 Migration Guide

### **From v2.0.0 to v3.0.0**

1. **Update Environment Variables:**
   ```bash
   # Add Slave project variables
   SLAVE_URL=https://your-slave-project.supabase.co
   SLAVE_SERVICE_ROLE_KEY=your_slave_service_role_key
   ```

2. **Setup Slave Database:**
   ```bash
   # Execute SLAVE_SETUP_COMPLETO.sql in Slave project
   npm run slave:init
   ```

3. **Deploy Edge Functions:**
   ```bash
   npm run deploy-functions
   ```

4. **Update Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

5. **Verify Setup:**
   ```bash
   npm run test:deep
   npm run verify:rbac
   ```

---

## 🐛 Known Issues

### **v3.0.0**
- None currently known

### **Resolved in v3.0.0**
- Fixed foreign key creation with correct column names
- Resolved Edge Function environment variable issues
- Fixed RLS performance issues
- Corrected schema synchronization problems

---

## 📞 Support

For issues or questions:
1. Check [README.md](./README.md) for setup instructions
2. Review [START_HERE.md](./START_HERE.md) for quick start
3. See [docs/README.md](./docs/README.md) for technical documentation
4. Run `npm run test:deep` to verify system health

---

**📝 Changelog maintained by the Flouee Team**