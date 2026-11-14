import React from 'react';
import {createRoot} from 'react-dom/client';
import Studio from '../app/admin/studio';
createRoot(document.getElementById('root')!).render(<Studio name="Локальный редактор" localMode/>);
