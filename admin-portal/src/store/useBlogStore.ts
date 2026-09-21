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
  SystemAuditLog,
  PlatformModuleConfig
} from '../types';
import { apiClient } from '../services/apiClient'; // TRD §12: live API integration
import { cleanAvatarUrl } from '../utils/permissions';
import {
  INITIAL_WEBSITES,
  INITIAL_MODULES
} from '../data/initialData';


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
  modules: PlatformModuleConfig[];
  searchQuery: string;
  editingBlogId: string | null;
  editorLang: LanguageCode;
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  isGuideOpen: boolean;

  // Real Auth State (TRD §4)
  isAuthenticated: boolean;
  currentUser: UserAccount | null;

  isLoading: boolean;

  // Actions
  fetchBlogs: (overrideSiteId?: string) => Promise<void>;
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
  startCreateBlog: () => void;
  startEditBlog: (id: string) => void;
  saveBlog: (blog: Blog) => Promise<void> | void;
  transitionBlogStatus: (blogId: string, newStatus: BlogStatus, notes?: string, scheduledAt?: string) => Promise<void> | void;
  deleteBlog: (id: string) => Promise<void> | void;
  addMediaItem: (item: MediaItem) => void;
  deleteMediaItem: (id: string) => Promise<void> | void;
  addCategory: (cat: Partial<Category> & { websiteId: string; name: string }) => Promise<Category | void>;
  deleteCategory: (id: string, websiteId: string) => Promise<void>;
  addTag: (tag: Partial<Tag> & { websiteId: string; name: string }) => Promise<Tag | void>;
  deleteTag: (id: string, websiteId: string) => Promise<void>;
  addWebsite: (site: Partial<Website>) => Promise<Website | void>;
  updateWebsite: (id: string, updates: Partial<Website>) => Promise<void> | void;
  deleteWebsite: (id: string) => Promise<void> | void;
  addUser: (user: UserAccount) => Promise<void> | void;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void> | void;
  deleteUser: (id: string) => Promise<void> | void;
  resetUserPassword: (userId: string) => Promise<{ success: boolean; tempPassword?: string; message?: string }>;
  addRedirect: (redirect: Partial<RedirectItem>) => Promise<void> | void;
  deleteRedirect: (id: string) => Promise<void> | void;
  addAuditLog: (log: SystemAuditLog) => void;
  toggleModule: (id: string, enabled: boolean) => void;
  updateModulePermissions: (id: string, roles?: UserRole[], sites?: string[]) => void;
  addCustomPlugin: (plugin: PlatformModuleConfig) => void;
  deleteCustomPlugin: (id: string) => void;
  resetModulesToDefault: () => void;
  clearNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set, get) => ({
      websites: INITIAL_WEBSITES,
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
      modules: INITIAL_MODULES,
      searchQuery: '',
      editingBlogId: null,
      editorLang: 'en',
      notification: null,
      theme: 'light',
      sidebarOpen: true,
      isGuideOpen: false,
      isAuthenticated: false,
      currentUser: null,
      isLoading: false,

      fetchBlogs: async (overrideSiteId?: string) => {
        set({ isLoading: true });
        try {
          const siteId = overrideSiteId !== undefined ? overrideSiteId : get().activeWebsiteId;
          const res = await apiClient.getBlogs({
            websiteId: siteId === 'all' ? undefined : siteId,
            limit: 100,
          });
          if (res && Array.isArray(res.data)) {
            set((state) => {
              const currentSite = siteId;
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
              if (websiteId && websiteId !== 'all') {
                catMap[websiteId] = res;
              } else {
                res.forEach((cat) => {
                  if (!catMap[cat.websiteId]) catMap[cat.websiteId] = [];
                  if (!catMap[cat.websiteId].some((c) => c.id === cat.id)) {
                    catMap[cat.websiteId].push(cat);
                  }
                });
              }
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
              if (websiteId && websiteId !== 'all') {
                tagMap[websiteId] = res;
              } else {
                res.forEach((tag) => {
                  if (!tagMap[tag.websiteId]) tagMap[tag.websiteId] = [];
                  if (!tagMap[tag.websiteId].some((t) => t.id === tag.id)) {
                    tagMap[tag.websiteId].push(tag);
                  }
                });
              }
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
          // Lightweight core shell initialization: only websites + current user profile (prevents 8-request waterfall)
          const [websitesRes, profileRes] = await Promise.allSettled([
            apiClient.getWebsites(),
            apiClient.getProfile(),
          ]);

          const updates: Partial<BlogState> = {};
          if (websitesRes.status === 'fulfilled' && Array.isArray(websitesRes.value)) {
            const map = new Map<string, Website>();
            websitesRes.value.forEach((w) => map.set(w.id, w));
            updates.websites = Array.from(map.values());
          }
          if (profileRes.status === 'fulfilled' && profileRes.value) {
            const u = profileRes.value;
            updates.currentUser = {
              ...u,
              avatar: cleanAvatarUrl(u.avatar) || '/uploads/avatars/avatar-default.webp',
            };
          }

          if (Object.keys(updates).length > 0) {
            set(updates);
          }
        } catch (err) {
          console.warn('Failed to load initial shell data from API:', err);
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
              currentUser: {
                ...user,
                avatar: cleanAvatarUrl(user.avatar) || '/uploads/avatars/avatar-default.webp',
              },
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
        apiClient.clearTokens();
        set({ isAuthenticated: false, currentUser: null, activeWebsiteId: 'all' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jupsoft_auth_token');
          localStorage.removeItem('jupsoft_refresh_token');
          document.cookie = 'jupsoft_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
          document.cookie = 'jupsoft_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
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
          const isNewDraft = savedBlog.id.startsWith('new-');
          const exists = !isNewDraft && get().blogs.some((b) => b.id === savedBlog.id);
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
              notification: { message: exists ? 'Blog updated ✅' : 'Blog created ✅', type: 'success' },
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
              notification: { message: `Blog moved to "${newStatus}" ✅`, type: 'success' },
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

      addCategory: async (cat) => {
        try {
          const created = await apiClient.createCategory({
            websiteId: cat.websiteId,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            parentId: cat.parentId,
          });
          set((state) => {
            const current = state.categories[created.websiteId] || [];
            return {
              categories: {
                ...state.categories,
                [created.websiteId]: [...current.filter((c) => c.id !== created.id), created],
              },
              notification: { message: `Category "${created.name}" created`, type: 'success' },
            };
          });
          return created;
        } catch (err: any) {
          console.error('Failed to create category:', err);
          set({ notification: { message: err?.message || 'Failed to create category', type: 'warning' } });
        }
      },

      deleteCategory: async (id: string, websiteId: string) => {
        try {
          await apiClient.deleteCategory(id);
          set((state) => {
            const current = state.categories[websiteId] || [];
            return {
              categories: {
                ...state.categories,
                [websiteId]: current.filter((c) => c.id !== id),
              },
              notification: { message: 'Category deleted', type: 'info' },
            };
          });
        } catch (err: any) {
          console.error('Failed to delete category:', err);
          set({ notification: { message: err?.message || 'Failed to delete category', type: 'warning' } });
        }
      },

      addTag: async (tag) => {
        try {
          const created = await apiClient.createTag({
            websiteId: tag.websiteId,
            name: tag.name,
            slug: tag.slug,
          });
          set((state) => {
            const current = state.tags[created.websiteId] || [];
            return {
              tags: {
                ...state.tags,
                [created.websiteId]: [...current.filter((t) => t.id !== created.id), created],
              },
              notification: { message: `Tag "#${created.name}" added`, type: 'success' },
            };
          });
          return created;
        } catch (err: any) {
          console.error('Failed to create tag:', err);
          set({ notification: { message: err?.message || 'Failed to create tag', type: 'warning' } });
        }
      },

      deleteTag: async (id: string, websiteId: string) => {
        try {
          await apiClient.deleteTag(id);
          set((state) => {
            const current = state.tags[websiteId] || [];
            return {
              tags: {
                ...state.tags,
                [websiteId]: current.filter((t) => t.id !== id),
              },
              notification: { message: 'Tag deleted', type: 'info' },
            };
          });
        } catch (err: any) {
          console.error('Failed to delete tag:', err);
          set({ notification: { message: err?.message || 'Failed to delete tag', type: 'warning' } });
        }
      },

      addWebsite: async (site) => {
        try {
          const created = await apiClient.createWebsite(site);
          set((state) => ({
            websites: [...state.websites.filter((w) => w.id !== created.id), created],
            notification: { message: `New tenant "${created.name}" registered successfully`, type: 'success' },
          }));
          return created;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to register website';
          set({
            notification: { message: msg, type: 'warning' },
          });
          throw err;
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
          const targetWebsiteId = Object.keys(user.roleAssignments)[0] || 'site-cloud';
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
          set({
            notification: { message: msg, type: 'warning' },
          });
          throw err;
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

      resetUserPassword: async (userId: string) => {
        try {
          const res = await apiClient.resetUserPassword(userId);
          if (res.success) {
            set((state) => ({
              users: state.users.map((u) =>
                u.id === userId ? { ...u, tempPassword: res.tempPassword } : u
              ),
              notification: { message: `Temporary password reset: ${res.tempPassword}`, type: 'success' },
            }));
          }
          return res;
        } catch (err: any) {
          console.error('resetUserPassword error:', err);
          set({ notification: { message: err?.message || 'Failed to reset password', type: 'warning' } });
          return { success: false, message: err?.message };
        }
      },

      toggleModule: (id: string, enabled: boolean) => {
        set((state) => {
          const updated = state.modules.map((m) =>
            m.id === id ? { ...m, enabled } : m
          );
          const mod = state.modules.find((m) => m.id === id);
          return {
            modules: updated,
            notification: {
              message: `Module "${mod?.name || id}" has been ${enabled ? 'enabled' : 'disabled'}.`,
              type: enabled ? 'success' : 'info',
            },
          };
        });
      },

      updateModulePermissions: (id: string, roles?: UserRole[], sites?: string[]) => {
        set((state) => {
          const updated = state.modules.map((m) => {
            if (m.id !== id) return m;
            return {
              ...m,
              allowedRoles: roles !== undefined ? roles : m.allowedRoles,
              allowedWebsites: sites !== undefined ? sites : m.allowedWebsites,
            };
          });
          return {
            modules: updated,
            notification: {
              message: 'Module access permissions updated successfully.',
              type: 'success',
            },
          };
        });
      },

      addCustomPlugin: (plugin: PlatformModuleConfig) => {
        set((state) => {
          if (state.modules.some((m) => m.id.toLowerCase() === plugin.id.toLowerCase())) {
            return {
              notification: {
                message: `Module or Plugin with ID "${plugin.id}" already exists.`,
                type: 'warning',
              },
            };
          }
          const newPlugin: PlatformModuleConfig = {
            ...plugin,
            isCustomPlugin: true,
            version: plugin.version || '1.0.0',
            author: plugin.author || 'Custom Plugin',
          };
          return {
            modules: [...state.modules, newPlugin],
            notification: {
              message: `Custom plugin "${plugin.name}" created and registered successfully.`,
              type: 'success',
            },
          };
        });
      },

      deleteCustomPlugin: (id: string) => {
        set((state) => {
          const target = state.modules.find((m) => m.id === id);
          if (!target) {
            return {
              notification: { message: `Plugin "${id}" not found.`, type: 'warning' },
            };
          }
          if (!target.isCustomPlugin) {
            return {
              notification: {
                message: `Cannot delete core system module "${target.name}". You can disable it instead.`,
                type: 'warning',
              },
            };
          }
          return {
            modules: state.modules.filter((m) => m.id !== id),
            notification: {
              message: `Custom plugin "${target.name}" uninstalled.`,
              type: 'info',
            },
          };
        });
      },

      resetModulesToDefault: () => {
        set({
          modules: INITIAL_MODULES,
          notification: {
            message: 'Platform modules and custom plugins reset to system defaults.',
            type: 'info',
          },
        });
      },

      showNotification: (message, type = 'info') => {
        set({ notification: { message, type } });
      },

      clearNotification: () => set({ notification: null }),
    }),
    {
      name: 'jupsoft_cms_platform_store_v7',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // ONLY persist preferences, user session and custom modules (prevents mobile QuotaExceededError)
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        activeWebsiteId: state.activeWebsiteId,
        activeRole: state.activeRole,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        modules: state.modules,
      }),
    }
  )
);

