import { MediaLibraryView } from '../../../components/media/MediaLibraryView';

export const metadata = {
  title: 'Media Assets | Jupsoft CMS',
  description: 'Manage S3 WebP assets and CDN images per website tenant',
};

export default function MediaPage() {
  return <MediaLibraryView />;
}
