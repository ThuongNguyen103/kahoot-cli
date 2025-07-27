// client/src/components/AdminScreen.js

import React, { useState, useEffect, useRef } from 'react';
import './AdminScreen.css';

function AdminScreen({ socket, authSuccess, onAuthSuccess }) {
    const [password, setPassword] = useState('');
    const [authMessage, setAuthMessage] = useState('');
    const [selectedQuestionSet, setSelectedQuestionSet] = useState('');
    const [questionSets, setQuestionSets] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [playerList, setPlayerList] = useState([]); // Danh sách người chơi
    const [adminLeaderboard, setAdminLeaderboard] = useState([]);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (authSuccess) {
            socket.emit('admin-get-leaderboard', (lb) => {
                setAdminLeaderboard(lb);
            });
        }

        socket.on('game-state', (state) => {
            setGameStatus(state.status);
            setQuestionSets(state.questionSets);
            setSelectedQuestionSet(state.currentQuestionSetId || '');
            setPlayerList(state.players); // Cập nhật playerList từ game-state
            if (state.currentQuestion) {
                setCurrentQuestion(state.currentQuestion);
            } else {
                setCurrentQuestion(null);
            }
        });

        socket.on('player-list-update', (updatedPlayers) => {
            setPlayerList(updatedPlayers); // Cập nhật playerList khi có thay đổi từ server
            setAdminLeaderboard(prevLeaderboard => {
                const newLeaderboard = [...prevLeaderboard];
                updatedPlayers.forEach(p => {
                    const existingIndex = newLeaderboard.findIndex(item => item.nickname === p.nickname);
                    if (existingIndex !== -1) {
                        newLeaderboard[existingIndex] = { ...newLeaderboard[existingIndex], score: p.score, connected: p.connected };
                    } else {
                        newLeaderboard.push({ nickname: p.nickname, score: p.score, avatarId: p.avatarId, connected: p.connected });
                    }
                });
                return newLeaderboard.sort((a, b) => b.score - a.score);
            });
        });

        socket.on('game-started', () => {
            setGameStatus('playing');
            console.log('Game bắt đầu, câu hỏi đầu tiên đang được hiển thị.');
        });

        socket.on('showing-question', (data) => {
            setGameStatus('showing_question');
            setCurrentQuestion(data);
            console.log('Admin: Hiển thị câu hỏi:', data.questionText);
        });

        socket.on('countdown', (value) => {
            setGameStatus('countdown_to_options');
            console.log('Admin: Đếm ngược:', value);
        });

        socket.on('new-question', (question) => {
            setGameStatus('playing');
            setCurrentQuestion(question);
            console.log('Admin: Câu hỏi đang chạy:', question.questionText);
        });

        socket.on('question-ended', (data) => {
            setGameStatus('showing_results');
            console.log('Admin: Câu hỏi kết thúc, hiển thị kết quả.');
        });

        socket.on('game-ended', (data) => {
            setGameStatus('ended');
            setCurrentQuestion(null);
            setAdminLeaderboard(data.adminLeaderboard || []);
            console.log('Admin: Trò chơi đã kết thúc. Xem tổng kết.');
        });

        socket.on('question-sets-updated', (updatedSets) => {
            setQuestionSets(updatedSets);
            if (updatedSets.length > 0) {
                setSelectedQuestionSet(updatedSets[0].id);
            } else {
                setSelectedQuestionSet('');
            }
        });

        socket.on('admin-leaderboard-update', (lb) => {
            setAdminLeaderboard(lb);
            console.log('Admin Leaderboard cập nhật:', lb);
        });

        socket.on('admin-message', (message) => {
            setAuthMessage(message);
            setTimeout(() => setAuthMessage(''), 3000);
        });


        return () => {
            socket.off('game-state');
            socket.off('player-list-update');
            socket.off('game-started');
            socket.off('showing-question');
            socket.off('countdown');
            socket.off('new-question');
            socket.off('question-ended');
            socket.off('game-ended');
            socket.off('question-sets-updated');
            socket.off('admin-leaderboard-update');
            socket.off('admin-message');
        };
    }, [socket, authSuccess]);

    const handleAuth = () => {
        if (password.trim()) {
            socket.emit('admin-auth', password, (response) => {
                setAuthMessage(response.message);
                if (response.success) {
                    onAuthSuccess();
                }
                setTimeout(() => setAuthMessage(''), 3000);
            });
        } else {
            setAuthMessage('Vui lòng nhập mật khẩu.');
            setTimeout(() => setAuthMessage(''), 3000);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setAuthMessage('Vui lòng chọn một file JSON.');
            return;
        }
        if (file.type !== 'application/json') {
            setAuthMessage('Vui lòng chọn file có định dạng JSON.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = e.target.result;
                socket.emit('admin-upload-question-set', jsonData, (response) => {
                    setAuthMessage(response.message);
                    if (response.success) {
                        // File đã được tải lên và xử lý thành công trên server
                        // socket.on('question-sets-updated') sẽ tự động cập nhật UI
                    } else {
                        // Hiển thị lỗi từ server
                    }
                    setTimeout(() => setAuthMessage(''), 5000);
                });
            } catch (error) {
                setAuthMessage('Lỗi khi đọc file. Đảm bảo đây là file JSON hợp lệ.');
                setTimeout(() => setAuthMessage(''), 3000);
            }
        };
        reader.readAsText(file);
    };

    const handleSelectQuestionSet = () => {
        if (selectedQuestionSet) {
            socket.emit('admin-select-question-set', selectedQuestionSet);
            setAuthMessage('Đã chọn bộ câu hỏi!');
            setTimeout(() => setAuthMessage(''), 3000);
        }
    };

    const handleStartGame = () => {
        socket.emit('admin-start-game');
        setAuthMessage('Đã gửi lệnh bắt đầu trò chơi!');
        setTimeout(() => setAuthMessage(''), 3000);
    };

    const handleEndGame = () => {
        socket.emit('admin-end-game');
        setAuthMessage('Đã gửi lệnh kết thúc trò chơi!');
        setTimeout(() => setAuthMessage(''), 3000);
    };

    const getGameStatusText = () => {
        switch (gameStatus) {
            case 'waiting': return 'Đang chờ (chọn bộ câu hỏi/sẵn sàng bắt đầu)';
            case 'showing_question': return 'Đang hiển thị câu hỏi (5s)';
            case 'countdown_to_options': return 'Đang đếm ngược để hiển thị đáp án (3s)';
            case 'playing': return 'Đang chơi (câu hỏi đang chạy)';
            case 'showing_results': return 'Đang hiển thị kết quả câu hỏi';
            case 'ended': return 'Đã kết thúc';
            default: return 'Không xác định';
        }
    };

    // Tính số người chơi đang kết nối
    const connectedPlayersCount = playerList.filter(p => p.connected).length;

    if (!authSuccess) {
        return (
            <div className="admin-auth-screen">
                <h2>Xác thực Admin</h2>
                <input
                    type="password"
                    placeholder="Mật khẩu Admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleAuth}>Xác nhận</button>
            </div>
        );
    }

    return (
        <div className="admin-screen">
            <h1>Admin Panel</h1>
            <p className="game-status-display">Trạng thái game: **{getGameStatusText()}**</p>
            {currentQuestion && <p className="current-question-display">Câu hỏi hiện tại: **{currentQuestion.questionText}**</p>}

            <div className="admin-section">
                <h2>Cấu hình Game</h2>
                <div className="form-group">
                    <label>Tải lên bộ câu hỏi từ file JSON:</label>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        disabled={gameStatus === 'playing' || gameStatus === 'showing_question' || gameStatus === 'countdown_to_options'}
                    />
                </div>
                <div className="form-group">
                    <label>Chọn bộ câu hỏi:</label>
                    <select
                        value={selectedQuestionSet}
                        onChange={(e) => setSelectedQuestionSet(e.target.value)}
                        // eslint-disable-next-line no-mixed-operators
                        disabled={gameStatus !== 'waiting' && gameStatus !== 'ended' || questionSets.length === 0}
                    >
                        <option value="">Chọn một bộ câu hỏi</option>
                        {questionSets.map(set => (
                            <option key={set.id} value={set.id}>{set.name}</option>
                        ))}
                    </select>
                    <button onClick={handleSelectQuestionSet} disabled={!selectedQuestionSet || (gameStatus !== 'waiting' && gameStatus !== 'ended')}>Xác nhận Bộ câu hỏi</button>
                </div>
            </div>

            <hr/>

            <div className="admin-section game-controls">
                <h2>Điều khiển Trò chơi</h2>
                <button
                    onClick={handleStartGame}
                    disabled={gameStatus === 'playing' || gameStatus === 'showing_question' || gameStatus === 'countdown_to_options' || !selectedQuestionSet || gameStatus === 'ended'}
                >
                    Bắt đầu Trò chơi
                </button>
                <button
                    onClick={handleEndGame}
                    disabled={gameStatus === 'ended'}
                >
                    Kết thúc Trò chơi
                </button>
            </div>

            <hr/>

            <div className="admin-section">
                <h2>Người chơi đang kết nối ({connectedPlayersCount})</h2> {/* HIỂN THỊ SỐ LƯỢNG NGƯỜI CHƠI */}
                <ul className="player-list-admin">
                    {playerList.length > 0 ? (
                        playerList.map(p => (
                            <li key={p.id} className={p.connected ? '' : 'disconnected'}>
                                <img src={`/${p.avatarId}.png`} alt={p.avatarId} className="player-avatar-small" />
                                {p.nickname}: {p.score} điểm {p.connected ? '' : '(Ngắt kết nối)'}
                            </li>
                        ))
                    ) : (
                        <li>Chưa có người chơi nào</li>
                    )}
                </ul>
            </div>

            <hr/>

            <div className="admin-section">
                <h2>Bảng xếp hạng đã lưu (Admin)</h2>
                <p>Bao gồm cả những người chơi đã thoát.</p>
                <ul className="leaderboard-list-admin">
                    {adminLeaderboard.length > 0 ? (
                        adminLeaderboard.map((p, index) => (
                            <li key={p.nickname + index} className={p.connected ? '' : 'disconnected'}>
                                {index + 1}. <img src={`/${p.avatarId}.png`} alt={p.avatarId} className="player-avatar-small" />
                                {p.nickname}: {p.score} điểm {p.connected ? '' : '(Đã thoát)'}
                            </li>
                        ))
                    ) : (
                        <li>Chưa có dữ liệu.</li>
                    )}
                </ul>
            </div>

            {authMessage && <div className="admin-message">{authMessage}</div>}
        </div>
    );
}

export default AdminScreen;