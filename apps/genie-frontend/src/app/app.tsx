import React, { useState } from 'react';
import { Plus, Menu, Sparkles, Globe, ChevronRight } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { UseCaseButton } from '../components/UseCaseButton';
import { OptionsModal } from '../components/OptionsModal';
import { Chat, Message } from '../types';
import RequireAuth from "../components/Auth/RequireAuth";
import ChatPage from '../pages/ChatPage';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";


export function App() {
  return(
  <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Navigate to="/chat/new" replace />
                  </RequireAuth>
                }
              />
              <Route path="/chat/new" element={<RequireAuth><ChatPage></ChatPage></RequireAuth>} ></Route>
              
              
            </Routes>
          </BrowserRouter>
  )
}

export default App;
