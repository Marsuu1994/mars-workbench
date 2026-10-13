'use client';

import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {ProjectFormPanel, type ProjectFormPanelProps} from './ProjectFormPanel';

interface ProjectModalProps extends ProjectFormPanelProps {
  isOpen: boolean;
}

/** New / Edit Project as a modal — a bottom sheet on mobile. */
export const ProjectModal = ({isOpen, ...panelProps}: ProjectModalProps) => (
  // Backdrop-dismiss stays off: a stray tap must not discard form input
  <OverlayShell
    variant="responsive"
    isOpen={isOpen}
    onClose={panelProps.onClose}
    dismissOnBackdrop={false}
    corners
    boxClassName="max-w-lg p-0"
  >
    {/* Mounted only while open, so every open starts a fresh form */}
    {isOpen && <ProjectFormPanel {...panelProps} />}
  </OverlayShell>
);
