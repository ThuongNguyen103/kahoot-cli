// client/src/App.js

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import PlayerScreen from './components/PlayerScreen';
import AdminScreen from './components/AdminScreen';
import './App.css'; // File CSS cho toàn bộ ứng dụng

const SOCKET_SERVER_URL = 'https://kahoot-server-0v12.onrender.com'; // Thay đổi nếu Back-end chạy trên cổng khác
const socket = io(SOCKET_SERVER_URL);

function App() {
    const [view, setView] = useState('home'); // 'home', 'player', 'admin'
    const [authSuccess, setAuthSuccess] = useState(false); // Trạng thái xác thực admin

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Đã kết nối tới server Socket.IO');
        });

        socket.on('disconnect', () => {
            console.log('Mất kết nối tới server Socket.IO');
            // Có thể hiển thị thông báo cho người dùng
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    const handleAdminAuthSuccess = () => {
        setAuthSuccess(true);
        setView('admin');
    };

    const renderView = () => {
        if (view === 'player') {
            return <PlayerScreen socket={socket} />;
        } else if (view === 'admin') {
            return <AdminScreen socket={socket} authSuccess={authSuccess} onAuthSuccess={handleAdminAuthSuccess} />;
        } else {
            return (
                <div className="home-screen">
                    <h1>Chào mừng đến với Kahoot Clone!</h1>
                    <button onClick={() => setView('player')}>Chơi ngay</button>
                    <button onClick={() => setView('admin')}>Tôi là Admin</button>
                </div>
            );
        }
    };

    return (
        <div className="App">
            {renderView()}
        </div>
    );
}

export default App;