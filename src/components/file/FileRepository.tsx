import React, { useState } from 'react';
import { Button, Snackbar } from '@mui/material';
import { FILE_PLUGIN } from '../../constants/plugins';
import { PluginRepository } from '../plugin';
import { FileUploadDialog } from './FileUploadDialog';

/**
 * File repositories use the generic config-driven page plus a bespoke
 * "Upload File" action (POST /content/file/files/) unique to pulp_file.
 */
export const FileRepository: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <>
      <PluginRepository
        plugin={FILE_PLUGIN}
        headerActions={
          <Button variant="outlined" onClick={() => setUploadOpen(true)}>
            Upload File
          </Button>
        }
      />
      <FileUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={setSuccessMessage}
      />
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </>
  );
};
