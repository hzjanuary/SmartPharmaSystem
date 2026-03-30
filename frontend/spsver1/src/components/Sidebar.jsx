import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({
  title = 'Smart Pharma System',
  subtitle = '',
  menuItems = [],
  onLogout,
}) => {
  return (
    <aside className="app-sidebar">
      <div className="app-logo">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <div className="menu-stack">
        {menuItems.map((item) => {
          if (item.to) {
            return (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`menu-button ${item.active ? 'active' : ''}`}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          );
        })}

        <button type="button" className="menu-button menu-danger" onClick={onLogout}>
          Thoát hệ thống
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;