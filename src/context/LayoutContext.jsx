import React, { createContext, useContext } from 'react';

const LayoutContext = createContext({ menuVisible: false, setMenuVisible: () => {}, navMode: 'clean', setNavMode: () => {} });

const LayoutProvider = LayoutContext.Provider;

const useLayout = () => useContext(LayoutContext);

export { LayoutProvider, useLayout };
