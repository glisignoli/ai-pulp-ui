import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Toolbar,
  Box,
} from '@mui/material';
import {
  Home,
  Assignment,
  Storage,
  Article,
  Cloud,
  Folder,
  Inventory2,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 60;

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    path: ROUTES.ROOT,
    icon: <Home />,
  },
  {
    title: 'Container',
    path: ROUTES.CONTAINER.ROOT,
    icon: <Storage />,
    children: [
      { title: 'Distributions', path: ROUTES.CONTAINER.DISTRIBUTION, icon: <Cloud /> },
      { title: 'Remotes', path: ROUTES.CONTAINER.REMOTE, icon: <Cloud /> },
      { title: 'Repositories', path: ROUTES.CONTAINER.REPOSITORY, icon: <Folder /> },
    ],
  },
  {
    title: 'DEB',
    path: ROUTES.DEB.ROOT,
    icon: <Storage />,
    children: [
      { title: 'Distribution', path: ROUTES.DEB.DISTRIBUTION, icon: <Cloud /> },
      { title: 'Packages', path: ROUTES.DEB.PACKAGES, icon: <Inventory2 /> },
      { title: 'Publication', path: ROUTES.DEB.PUBLICATION, icon: <Article /> },
      { title: 'Remote', path: ROUTES.DEB.REMOTE, icon: <Cloud /> },
      { title: 'Repository', path: ROUTES.DEB.REPOSITORY, icon: <Folder /> },
    ],
  },
  {
    title: 'File',
    path: ROUTES.FILE.ROOT,
    icon: <Article />,
    children: [
      { title: 'Distribution', path: ROUTES.FILE.DISTRIBUTION, icon: <Cloud /> },
      { title: 'Files', path: ROUTES.FILE.CONTENT_FILES, icon: <Inventory2 /> },
      { title: 'Publication', path: ROUTES.FILE.PUBLICATION, icon: <Article /> },
      { title: 'Remote', path: ROUTES.FILE.REMOTE, icon: <Cloud /> },
      { title: 'Repository', path: ROUTES.FILE.REPOSITORY, icon: <Folder /> },
    ],
  },
  {
    title: 'RPM',
    path: ROUTES.RPM.ROOT,
    icon: <Storage />,
    children: [
      { title: 'Distribution', path: ROUTES.RPM.DISTRIBUTION, icon: <Cloud /> },
      { title: 'Packages', path: ROUTES.RPM.PACKAGES, icon: <Inventory2 /> },
      { title: 'Publication', path: ROUTES.RPM.PUBLICATION, icon: <Article /> },
      { title: 'Remote', path: ROUTES.RPM.REMOTE, icon: <Cloud /> },
      { title: 'Repository', path: ROUTES.RPM.REPOSITORY, icon: <Folder /> },
    ],
  },
  {
    title: 'Tasks',
    path: ROUTES.TASKS.ROOT,
    icon: <Assignment />,
  },
];

interface NavigationDrawerProps {
  open: boolean;
  onToggle: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ open, onToggle }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const handleItemClick = (path: string, hasChildren: boolean) => {
    if (hasChildren) {
      setExpandedItems((prev) =>
        prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
      );
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: 'border-box',
          transition: 'width 0.3s',
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {navigationItems.map((item) => (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick(item.path, !!item.children)}
                  selected={isActive(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  {open && <ListItemText primary={item.title} />}
                  {open && item.children && (
                    expandedItems.includes(item.path) ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              {item.children && open && (
                <Collapse in={expandedItems.includes(item.path)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        sx={{ pl: 4 }}
                        onClick={() => handleItemClick(child.path, false)}
                        selected={isActive(child.path)}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.title} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={onToggle}>
              <ListItemIcon>
                {open ? <ChevronLeft /> : <ChevronRight />}
              </ListItemIcon>
              {open && <ListItemText primary="Collapse" />}
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

