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
    path: '/',
    icon: <Home />,
  },
  {
    title: 'Tasks',
    path: '/tasks',
    icon: <Assignment />,
  },
  {
    title: 'RPM',
    path: '/rpm',
    icon: <Storage />,
    children: [
      { title: 'Distribution', path: '/rpm/distribution', icon: <Cloud /> },
      { title: 'Publication', path: '/rpm/publication', icon: <Article /> },
      { title: 'Remote', path: '/rpm/remote', icon: <Cloud /> },
      { title: 'Repository', path: '/rpm/repository', icon: <Folder /> },
      { title: 'Packages', path: '/rpm/content/packages', icon: <Inventory2 /> },
    ],
  },
  {
    title: 'File',
    path: '/file',
    icon: <Article />,
    children: [
      { title: 'Distribution', path: '/file/distribution', icon: <Cloud /> },
      { title: 'Publication', path: '/file/publication', icon: <Article /> },
      { title: 'Remote', path: '/file/remote', icon: <Cloud /> },
      { title: 'Repository', path: '/file/repository', icon: <Folder /> },
    ],
  },
  {
    title: 'DEB',
    path: '/deb',
    icon: <Storage />,
    children: [
      { title: 'Distribution', path: '/deb/distribution', icon: <Cloud /> },
      { title: 'Publication', path: '/deb/publication', icon: <Article /> },
      { title: 'Remote', path: '/deb/remote', icon: <Cloud /> },
      { title: 'Repository', path: '/deb/repository', icon: <Folder /> },
      { title: 'Packages', path: '/deb/content/packages', icon: <Inventory2 /> },
    ],
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
