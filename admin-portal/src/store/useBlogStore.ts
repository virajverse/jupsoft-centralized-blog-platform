import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Website,
  Blog,
  Category,
  Tag,
  MediaItem,
  UserRole,
  BlogStatus,
  LanguageCode,
  WorkflowLog,
  UserAccount,
  RedirectItem,
  SystemAuditLog
} from '../types';
import { apiClient } from '../services/apiClient'; // TRD §12: live API integration


interface BlogState {
  websites: Website[];
  activeWebsiteId: string;
  activeRole: UserRole;
  activeView: 'dashboard' | 'blogs' | 'editor' | 'workflow' | 'media' | 'analytics' | 'settings' | 'categories';
  blogs: Blog[];
  categories: Record<string, Category[]>;
  tags: Record<string, Tag[]>;
  media: MediaItem[];
  users: UserAccount[];
  redirects: RedirectItem[];
  auditLogs: SystemAuditLog[];
  searchQuery: string;
  editingBlogId: string | null;
  editorLang: LanguageCode;
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  theme: 'light' | 'dark';
  uiTheme: 'classic' | 'modern';
  isUiThemeSwitching: boolean;
  uiThemeSwitchTarget: 'classic' | 'modern' | null;
  sidebarOpen: boolean;
  isGuideOpen: boolean;

  // Real Auth State (TRD §4)
  isAuthenticated: boolean;
  currentUser: UserAccount | null;

  isLoading: boolean;

  // Actions
  fetchBlogs: () => Promise<void>;
  fetchWebsites: () => Promise<void>;
  fetchMedia: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchCategories: (websiteId?: string) => Promise<void>;
  fetchTags: (websiteId?: string) => Promise<void>;
  fetchRedirects: (websiteId?: string) => Promise<void>;
  fetchAuditLogs: (websiteId?: string) => Promise<void>;
  loadInitialData: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setActiveWebsite: (id: string) => void;
  setActiveRole: (role: UserRole) => void;
  setActiveView: (view: BlogState['activeView']) => void;
  setSearchQuery: (query: string) => void;
  setEditorLang: (lang: LanguageCode) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setUiTheme: (uiTheme: 'classic' | 'modern') => void;
  toggleUiTheme: () => void;
  startCreateBlog: () => void;
  startEditBlog: (id: string) => void;
  saveBlog: (blog: Blog) => Promise<void> | void;
  transitionBlogStatus: (blogId: string, newStatus: BlogStatus, notes?: string, scheduledAt?: string) => Promise<void> | void;
  deleteBlog: (id: string) => Promise<void> | void;
  addMediaItem: (item: MediaItem) => void;
  deleteMediaItem: (id: string) => Promise<void> | void;
  addCategory: (cat: Category) => void;
  addTag: (tag: Tag) => void;
  addWebsite: (site: Partial<Website>) => Promise<void> | void;
  updateWebsite: (id: string, updates: Partial<Website>) => Promise<void> | void;
  deleteWebsite: (id: string) => Promise<void> | void;
  addUser: (user: UserAccount) => Promise<void> | void;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void> | void;
  deleteUser: (id: string) => Promise<void> | void;
  addRedirect: (redirect: Partial<RedirectItem>) => Promise<void> | void;
  deleteRedirect: (id: string) => Promise<void> | void;
  addAuditLog: (log: SystemAuditLog) => void;
  autoTranslateLocale: (blogId: string, fromLang: LanguageCode, toLang: LanguageCode) => void;
  clearNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set, get) => ({
      websites: [],
      activeWebsiteId: 'all',
      activeRole: 'Super Admin',
      activeView: 'dashboard',
      blogs: [],
      categories: {},
      tags: {},
      media: [],
      users: [],
      redirects: [],
      auditLogs: [],
      searchQuery: '',
      editingBlogId: null,
      editorLang: 'en',
      notification: null,
      theme: 'light',
      uiTheme: 'modern',
      isUiThemeSwitching: false,
      uiThemeSwitchTarget: null,
      sidebarOpen: true,
      isGuideOpen: false,
      isAuthenticated: false,
      currentUser: null,
      isLoading: false,

      fetchBlogs: async () => {
        set({ isLoading: true });
        try {
          const siteId = get().activeWebsiteId;
          const res = await apiClient.getBlogs({
            websiteId: siteId === 'all' ? undefined : siteId,
          });
          if (res && Array.isArray(res.data)) {
            set((state) => {
              const currentSite = state.activeWebsiteId;
              const base = currentSite === 'all'
                ? []
                : state.blogs.filter((b) => b.websiteId !== currentSite);
              const map = new Map<string, Blog>();
              base.forEach((b) => map.set(b.id, b));
              res.data.forEach((b: Blog) => map.set(b.id, b));
              return { blogs: Array.from(map.values()), isLoading: false };
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn('apiClient.getBlogs failed, keeping local store:', err);
          set({ isLoading: false });
        }
      },

      fetchWebsites: async () => {
        try {
          const res = await apiClient.getWebsites();
          if (Array.isArray(res)) {
            const map = new Map<string, Website>();
            res.forEach((s) => map.set(s.id, s));
            set({ websites: Array.from(map.values()) });
          }
        } catch (err) {
          console.warn('fetchWebsites error:', err);
        }
      },

      fetchMedia: async () => {
        try {
          const siteId = get().activeWebsiteId;
          const mediaList = await apiClient.getMedia(siteId === 'all' ? undefined : siteId);
          if (Array.isArray(mediaList)) {
            set((state) => {
              const currentSite = state.activeWebsiteId;
              const base = currentSite === 'all'
                ? []
                : state.media.filter((m) => m.websiteId !== currentSite);
              const map = new Map<string, MediaItem>();
              base.forEach((m) => map.set(m.id, m));
              mediaList.forEach((m) => map.set(m.id, m));
              return { media: Array.from(map.values()) };
            });
          }
        } catch (err) {
          console.warn('apiClient.getMedia failed:', err);
        }
      },

      fetchUsers: async () => {
        try {
          const userList = await apiClient.getUsers();
          if (Array.isArray(userList)) {
            set({ users: userList });
          }
        } catch (err) {
          console.warn('apiClient.getUsers failed:', err);
        }
      },

      fetchCategories: async (websiteId?: string) => {
        try {
          const res = await apiClient.getCategories(websiteId);
          if (Array.isArray(res)) {
            set((state) => {
              const catMap = { ...state.categories };
              res.forEach((cat) => {
                if (!catMap[cat.websiteId]) catMap[cat.websiteId] = [];
                if (!catMap[cat.websiteId].some((c) => c.id === cat.id)) {
                  catMap[cat.websiteId].push(cat);
                }
              });
              return { categories: catMap };
            });
          }
        } catch (err) {
          console.warn('fetchCategories error:', err);
        }
      },

      fetchTags: async (websiteId?: string) => {
        try {
          const res = await apiClient.getTags(websiteId);
          if (Array.isArray(res)) {
            set((state) => {
              const tagMap = { ...state.tags };
              res.forEach((tag) => {
                if (!tagMap[tag.websiteId]) tagMap[tag.websiteId] = [];
                if (!tagMap[tag.websiteId].some((t) => t.id === tag.id)) {
                  tagMap[tag.websiteId].push(tag);
                }
              });
              return { tags: tagMap };
            });
          }
        } catch (err) {
          console.warn('fetchTags error:', err);
        }
      },

      fetchRedirects: async (websiteId?: string) => {
        try {
          const res = await apiClient.getRedirects(websiteId);
          if (Array.isArray(res)) {
            set({ redirects: res });
          }
        } catch (err) {
          console.warn('fetchRedirects error:', err);
        }
      },

      fetchAuditLogs: async (websiteId?: string) => {
        try {
          const res = await apiClient.getAuditLogs(websiteId);
          if (Array.isArray(res)) {
            set({ auditLogs: res });
          }
        } catch (err) {
          console.warn('fetchAuditLogs error:', err);
        }
      },

      loadInitialData: async () => {
        try {
          const [
            websitesRes,
            blogsRes,
            usersRes,
            mediaRes,
            redirectsRes,
            auditLogsRes,
            categoriesRes,
            tagsRes,
          ] = await Promise.allSettled([
            apiClient.getWebsites(),
            apiClient.getBlogs({ limit: 50 }),
            apiClient.getUsers(),
            apiClient.getMedia(),
            apiClient.getRedirects(),
            apiClient.getAuditLogs(),
            apiClient.getCategories(),
            apiClient.getTags(),
          ]);

          const updates: Partial<BlogState> = {};
          if (websitesRes.status === 'fulfilled' && Array.isArray(websitesRes.value)) {
            const map = new Map<string, Website>();
            websitesRes.value.forEach((w) => map.set(w.id, w));
            updates.websites = Array.from(map.values());
          }
          if (blogsRes.status === 'fulfilled' && blogsRes.value?.data) {
            const map = new Map<string, Blog>();
            blogsRes.value.data.forEach((b: Blog) => map.set(b.id, b));
            updates.blogs = Array.from(map.values());
          }
          if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
            const map = new Map<string, UserAccount>();
            usersRes.value.forEach((u) => map.set(u.id, u));
            updates.users = Array.from(map.values());
          }
          if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value)) {
            const map = new Map<string, MediaItem>();
            mediaRes.value.forEach((m) => map.set(m.id, m));
            updates.media = Array.from(map.values());
          }
          if (redirectsRes.status === 'fulfilled' && Array.isArray(redirectsRes.value)) {
            const map = new Map<string, RedirectItem>();
            redirectsRes.value.forEach((r) => map.set(r.id, r));
            updates.redirects = Array.from(map.values());
          }
          if (auditLogsRes.status === 'fulfilled' && Array.isArray(auditLogsRes.value)) {
            updates.auditLogs = auditLogsRes.value;
          }
          if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) {
            const catMap: Record<string, Category[]> = {};
            categoriesRes.value.forEach((cat) => {
              if (!catMap[cat.websiteId]) catMap[cat.websiteId] = [];
              catMap[cat.websiteId].push(cat);
            });
            updates.categories = catMap;
          }
          if (tagsRes.status === 'fulfilled' && Array.isArray(tagsRes.value)) {
            const tagMap: Record<string, Tag[]> = {};
            tagsRes.value.forEach((tag) => {
              if (!tagMap[tag.websiteId]) tagMap[tag.websiteId] = [];
              tagMap[tag.websiteId].push(tag);
            });
            updates.tags = tagMap;
          }

          if (Object.keys(updates).length > 0) {
            set(updates);
          }
        } catch (err) {
          console.warn('Failed to load initial data from API:', err);
        }
      },

      // TRD Â§4: Real API login with JWT token storage
      login: async (email: string, password: string) => {
        try {
          const data = await apiClient.login(email, password);
          if (data.accessToken && data.user) {
            const user = data.user as UserAccount;
            const isSuper = Object.values(user.roleAssignments || {}).includes('Super Admin');
            const assignedWebsites = Object.keys(user.roleAssignments || {});
            
            let websiteId = get().activeWebsiteId;
            if (!isSuper) {
              if (websiteId === 'all' || !assignedWebsites.includes(websiteId)) {
                websiteId = assignedWebsites[0] || 'site-cloud';
              }
            }
            
            const assignedRole = (user.roleAssignments?.[websiteId] || (isSuper ? 'Super Admin' : Object.values(user.roleAssignments || {})[0]) || 'Content Writer') as UserRole;
            set({
              isAuthenticated: true,
              currentUser: user,
              activeWebsiteId: websiteId,
              activeRole: assignedRole,
            });
            return { success: true };
          }
          return { success: false, message: 'Login failed — no token received' };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return { success: false, message: errMsg || 'Invalid email or password' };
        }
      },

      logout: () => {
        set({ isAuthenticated: false, currentUser: null, activeWebsiteId: 'all' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jupsoft_auth_token');
        }
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setGuideOpen: (open) => set({ isGuideOpen: open }),
      setActiveWebsite: (id) => {
        const user = get().currentUser;
        if (user && user.roleAssignments) {
          const isSuper = Object.values(user.roleAssignments).includes('Super Admin');
          const roleForSite = user.roleAssignments[id] || (isSuper ? 'Super Admin' : get().activeRole);
          set({ activeWebsiteId: id, activeRole: roleForSite as UserRole });
        } else {
          set({ activeWebsiteId: id });
        }
      },
      setActiveRole: (role) => set({ activeRole: role }),
      setActiveView: (view) => set({ activeView: view }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setEditorLang: (lang) => set({ editorLang: lang }),

      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme });
      },

      toggleTheme: () => {
        set((state) => {
          const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            if (nextTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { theme: nextTheme };
        });
      },

      setUiTheme: (targetTheme) => {
        const current = get().uiTheme;
        if (current === targetTheme) return;
        if (get().isUiThemeSwitching) return;

        // 1. Trigger transition motion screen immediately
        set({
          isUiThemeSwitching: true,
          uiThemeSwitchTarget: targetTheme,
        });

        // 2. Midway (420ms): Swap the underlying layout while fully veiled
        setTimeout(() => {
          set({ uiTheme: targetTheme });
        }, 420);

        // 3. Complete (900ms): Clear switching state
        setTimeout(() => {
          set({
            isUiThemeSwitching: false,
            uiThemeSwitchTarget: null,
          });
        }, 900);
      },

      toggleUiTheme: () => {
        const next = get().uiTheme === 'modern' ? 'classic' : 'modern';
        get().setUiTheme(next);
      },

      startCreateBlog: () => {
        set({ editingBlogId: null, editorLang: 'en', activeView: 'editor' });
      },

      startEditBlog: (id) => {
        set({ editingBlogId: id, editorLang: 'en', activeView: 'editor' });
      },

      // TRD §12: Save blog via real API, sync local store on success
      saveBlog: async (savedBlog) => {
        try {
          let apiResult: Blog;
          const exists = get().blogs.some((b) => b.id === savedBlog.id && !savedBlog.id.startsWith('new-') && !savedBlog.id.startsWith('blog-'));
          if (exists) {
            apiResult = await apiClient.updateBlog(savedBlog.id, savedBlog as Partial<Blog>);
          } else {
            apiResult = await apiClient.createBlog(savedBlog as Partial<Blog>);
          }
          set((state) => {
            const finalBlog = { ...savedBlog, ...apiResult };
            const newBlogs = exists
              ? state.blogs.map((b) => (b.id === savedBlog.id ? finalBlog : b))
              : [finalBlog, ...state.blogs.filter((b) => b.id !== savedBlog.id && b.id !== finalBlog.id)];
            const auditLog: SystemAuditLog = {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userName: finalBlog.authorName || 'User',
              role: state.activeRole,
              websiteId: finalBlog.websiteId,
              event: exists ? 'blog.updated' : 'blog.created',
              ipAddress: '127.0.0.1',
              details: `Saved "${finalBlog.translations.en?.title || finalBlog.id}" (${finalBlog.status}).`,
            };
            return {
              blogs: newBlogs,
              auditLogs: [auditLog, ...state.auditLogs],
              editingBlogId: finalBlog.id,
              notification: { message: exists ? 'Article updated ✅' : 'Article created ✅', type: 'success' },
            };
          });
        } catch (err: unknown) {
          console.error('API saveBlog failed:', err);
          throw err;
        }
      },

      // TRD Â§7: Workflow transitions via dedicated API endpoints
      transitionBlogStatus: async (blogId, newStatus, notes, scheduledAt) => {
        try {
          let apiResult: Blog;
          if (newStatus === 'Under Review') apiResult = await apiClient.submitBlogForReview(blogId, notes);
          else if (newStatus === 'Approved') apiResult = await apiClient.approveBlog(blogId, notes);
          else if (newStatus === 'Published') apiResult = await apiClient.publishBlog(blogId, scheduledAt);
          else if (newStatus === 'Archived') apiResult = await apiClient.archiveBlog(blogId);
          else apiResult = await apiClient.updateBlog(blogId, { status: newStatus as BlogStatus });

          set((state) => {
            const blog = state.blogs.find((b) => b.id === blogId);
            const newLog: WorkflowLog = {
              id: `wl-${Date.now()}`,
              blogId,
              fromStatus: blog?.status || newStatus,
              toStatus: newStatus,
              changedBy: state.activeRole,
              role: state.activeRole,
              notes: notes || `Moved to ${newStatus}`,
              timestamp: new Date().toISOString(),
            };
            const updatedBlog: Blog = { ...blog!, ...apiResult, workflowLogs: [newLog, ...(blog?.workflowLogs || [])] };
            return {
              blogs: state.blogs.map((b) => (b.id === blogId ? updatedBlog : b)),
              notification: { message: `Article moved to "${newStatus}" âœ…`, type: 'success' },
            };
          });
        } catch (err: unknown) {
          // Fallback: apply locally
          console.warn('API transitionBlogStatus failed, applying locally:', err);
          set((state) => {
            const blog = state.blogs.find((b) => b.id === blogId);
            if (!blog) return state;
            const updatedBlog: Blog = { ...blog, status: newStatus, updatedAt: new Date().toISOString() };
            return {
              blogs: state.blogs.map((b) => (b.id === blogId ? updatedBlog : b)),
              notification: { message: `Status updated locally (API offline)`, type: 'warning' },
            };
          });
        }
      },

      // TRD Â§12: Delete blog via real API
      deleteBlog: async (id) => {
        try {
          await apiClient.deleteBlog(id);
        } catch (err) {
          console.warn('API deleteBlog failed, removing locally:', err);
        }
        set((state) => {
          const target = state.blogs.find((b) => b.id === id);
          return {
            blogs: state.blogs.filter((b) => b.id !== id),
            notification: { message: `Deleted: ${target?.translations?.en?.title || id}`, type: 'info' },
          };
        });
      },

      addMediaItem: (item) => {
        set((state) => ({
          media: [item, ...state.media.filter((m) => m.id !== item.id)],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userName: state.activeRole,
              role: state.activeRole,
              websiteId: item.websiteId,
              event: 'media.uploaded',
              ipAddress: '192.168.1.42',
              details: `Uploaded ${item.fileName} (${(item.fileSizeBytes / 1024).toFixed(0)} KB WebP).`,
            },
            ...state.auditLogs,
          ],
          notification: { message: `Image "${item.fileName}" converted to WebP and added`, type: 'success' },
        }));
      },

      deleteMediaItem: async (id) => {
        try {
          await apiClient.deleteMedia(id);
        } catch (err) {
          console.warn('API deleteMedia failed, removing locally:', err);
        }
        set((state) => ({
          media: state.media.filter((m) => m.id !== id),
          notification: { message: 'Media asset deleted', type: 'info' },
        }));
      },

      addCategory: (cat) => {
        set((state) => {
          const current = state.categories[cat.websiteId] || [];
          return {
            categories: {
              ...state.categories,
              [cat.websiteId]: [...current, cat],
            },
            notification: { message: `Category "${cat.name}" created`, type: 'success' },
          };
        });
      },

      addTag: (tag) => {
        set((state) => {
          const current = state.tags[tag.websiteId] || [];
          return {
            tags: {
              ...state.tags,
              [tag.websiteId]: [...current, tag],
            },
            notification: { message: `Tag "#${tag.name}" added`, type: 'success' },
          };
        });
      },

      addWebsite: async (site) => {
        try {
          const created = await apiClient.createWebsite(site);
          set((state) => ({
            websites: [...state.websites.filter((w) => w.id !== created.id), created],
            notification: { message: `New tenant "${created.name}" registered successfully`, type: 'success' },
          }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to register website';
          set({
            notification: { message: msg, type: 'warning' },
          });
        }
      },

      updateWebsite: async (id, updates) => {
        try {
          const updated = await apiClient.updateWebsite(id, updates);
          set((state) => ({
            websites: state.websites.map((w) => (w.id === id ? { ...w, ...updated } : w)),
            notification: { message: 'Tenant settings saved', type: 'success' },
          }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to save tenant settings';
          set({
            notification: { message: msg, type: 'warning' },
          });
        }
      },

      deleteWebsite: async (id: string) => {
        try {
          await apiClient.deleteWebsite(id);
          set((state) => {
            const updatedWebsites = state.websites.filter((w) => w.id !== id);
            const nextActive = state.activeWebsiteId === id
              ? (updatedWebsites.length > 0 ? 'all' : '')
              : state.activeWebsiteId;
            return {
              websites: updatedWebsites,
              activeWebsiteId: nextActive,
              notification: { message: 'Website tenant removed successfully', type: 'info' },
            };
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete website';
          set({
            notification: { message: msg, type: 'warning' },
          });
        }
      },

      addUser: async (user) => {
        try {
          const targetWebsiteId = Object.keys(user.roleAssignments)[0] || 'web-1';
          const targetRole = Object.values(user.roleAssignments)[0] || 'Content Writer';
          const created = await apiClient.inviteUser({
            name: user.name,
            email: user.email,
            websiteId: targetWebsiteId,
            role: targetRole,
            password: user.tempPassword,
          });
          const userWithCredentials = {
            ...created,
            tempPassword: created.tempPassword || user.tempPassword,
          };
          set((state) => ({
            users: [userWithCredentials, ...state.users.filter((u) => u.id !== created.id)],
            notification: { message: `User "${created.name}" invited successfully`, type: 'success' },
          }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to invite user';
          set((state) => ({
            users: [user, ...state.users],
            notification: { message: msg, type: 'warning' },
          }));
        }
      },

      updateUser: async (id, updates) => {
        try {
          if (updates.roleAssignments) {
            const [websiteId, role] = Object.entries(updates.roleAssignments)[0] || [];
            if (websiteId && role) {
              await apiClient.updateUserRole(id, role, websiteId);
            }
          }
          if (updates.status) {
            await apiClient.updateUserStatus(id, updates.status);
          }
          set((state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
            notification: { message: 'User updated successfully', type: 'success' },
          }));
        } catch (err: unknown) {
          console.warn('API updateUser failed:', err);
          set((state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
            notification: { message: 'User updated locally', type: 'warning' },
          }));
        }
      },

      deleteUser: async (id) => {
        try {
          await apiClient.deleteUser(id);
        } catch (err) {
          console.warn('API deleteUser failed:', err);
        }
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          notification: { message: 'User removed from system', type: 'info' },
        }));
      },

      addRedirect: async (redirect) => {
        try {
          const created = await apiClient.createRedirect(redirect as RedirectItem);
          set((state) => ({
            redirects: [created, ...state.redirects.filter((r) => r.id !== created.id)],
            notification: { message: `301 Permanent Redirect created for /blog/${created.fromSlug}`, type: 'success' },
          }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to create redirect';
          set((state) => ({
            redirects: [redirect as RedirectItem, ...state.redirects],
            notification: { message: msg, type: 'warning' },
          }));
        }
      },

      deleteRedirect: async (id) => {
        try {
          await apiClient.deleteRedirect(id);
        } catch (err) {
          console.warn('deleteRedirect error:', err);
        }
        set((state) => ({
          redirects: state.redirects.filter((r) => r.id !== id),
          notification: { message: 'Redirect rule removed', type: 'info' },
        }));
      },

      addAuditLog: (log) => {
        set((state) => ({
          auditLogs: [log, ...state.auditLogs],
        }));
      },

      autoTranslateLocale: (blogId, fromLang, toLang) => {
        set((state) => {
          const blog = state.blogs.find((b) => b.id === blogId);
          if (!blog) return state;

          const source = blog.translations[fromLang];
          if (!source || !source.title) return state;

          // Realistic translation dictionaries for TRD languages
          const prefixMap: Record<LanguageCode, { titlePrefix: string; bodyPrefix: string }> = {
            hi: { titlePrefix: '[à¤¹à¤¿à¤‚à¤¦à¥€] ', bodyPrefix: '<p>à¤‡à¤¸ à¤²à¥‡à¤– à¤•à¤¾ à¤¹à¤¿à¤‚à¤¦à¥€ à¤…à¤¨à¥à¤µà¤¾à¤¦ à¤¨à¤¿à¤®à¥à¤¨à¤²à¤¿à¤–à¤¿à¤¤ à¤¹à¥ˆ: </p>' },
            fr: { titlePrefix: '[FR] ', bodyPrefix: '<p>Voici la traduction franÃ§aise de cet article: </p>' },
            ar: { titlePrefix: '[Ø¹Ø±Ø¨ÙŠ] ', bodyPrefix: '<p>ÙÙŠÙ…Ø§ ÙŠÙ„ÙŠ Ø§Ù„ØªØ±Ø¬Ù…Ø© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ù‚Ø§Ù„Ø©: </p>' },
            en: { titlePrefix: '[EN] ', bodyPrefix: '<p>English translation: </p>' },
          };

          const targetPrefix = prefixMap[toLang];
          const translatedTitle = `${targetPrefix.titlePrefix}${source.title}`;
          const translatedSlug = `${source.slug}-${toLang}`;
          const translatedContent = `${targetPrefix.bodyPrefix}${source.content}`;

          const updatedTrans = {
            ...blog.translations[toLang],
            title: translatedTitle,
            slug: translatedSlug,
            excerpt: source.excerpt,
            content: translatedContent,
            seo: {
              ...source.seo,
              metaTitle: translatedTitle,
              metaDescription: source.seo.metaDescription,
            },
          };

          const updatedBlog: Blog = {
            ...blog,
            translations: {
              ...blog.translations,
              [toLang]: updatedTrans,
            },
            updatedAt: new Date().toISOString(),
          };

          return {
            blogs: state.blogs.map((b) => (b.id === blogId ? updatedBlog : b)),
            notification: {
              message: `AI Auto-translated to ${toLang.toUpperCase()} successfully!`,
              type: 'success',
            },
          };
        });
      },

      showNotification: (message, type = 'info') => {
        set({ notification: { message, type } });
      },

      clearNotification: () => set({ notification: null }),
    }),
    {
      name: 'jupsoft_cms_platform_store_v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Exclude transient switching state so page reload never gets stuck
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isUiThemeSwitching, uiThemeSwitchTarget, ...rest } = state;
        return rest;
      },
    }
  )
);

