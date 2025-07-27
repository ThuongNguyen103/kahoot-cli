// client/src/components/PlayerScreen.js

import React, { useState, useEffect, useRef } from 'react';
import './PlayerScreen.css';

const avatars = [
    'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6',
    'avatar7', 'avatar8', 'avatar9', 'avatar10', 'avatar11', 'avatar12'
];

function PlayerScreen({ socket }) {
    const [nickname, setNickname] = useState('');
    const [avatarId, setAvatarId] = useState('avatar1');
    const [joined, setJoined] = useState(false);
    const [joinMessage, setJoinMessage] = useState('');
    const [gameStatus, setGameStatus] = useState('waiting');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [answerFeedback, setAnswerFeedback] = useState(null);
    const [playerList, setPlayerList] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [correctAnswerId, setCorrectAnswerId] = useState(null);
    const [countdownValue, setCountdownValue] = useState(0);
    const [showPlayerInfo, setShowPlayerInfo] = useState(false);
    const [myInfo, setMyInfo] = useState({ nickname: '', avatarId: '', score: 0 });

    const timerRef = useRef(null);

    useEffect(() => {
        socket.on('game-state', (state) => {
            setGameStatus(state.status);
            setPlayerList(state.players);
            setLeaderboard(state.leaderboard);
            if (state.status === 'playing' || state.status === 'showing_results' || state.status === 'showing_question' || state.status === 'countdown_to_options') {
                setCurrentQuestion(state.currentQuestion);
                setSelectedAnswer(null);
                setAnswerFeedback(null);
                setCorrectAnswerId(null);
                if (state.status === 'playing' && state.timeRemaining > 0) {
                    setTimeLeft(state.timeRemaining);
                    startTimer(state.timeRemaining);
                } else if (state.status === 'countdown_to_options') {
                    setCountdownValue(state.countdownValue);
                }
            } else {
                setCurrentQuestion(null);
            }
        });

        socket.on('player-list-update', (updatedPlayers) => {
            setPlayerList(updatedPlayers);
            const currentPlayer = updatedPlayers.find(p => p.id === socket.id);
            if (currentPlayer) {
                setMyInfo({ nickname: currentPlayer.nickname, avatarId: currentPlayer.avatarId, score: currentPlayer.score });
            }
        });

        socket.on('game-started', () => {
            setGameStatus('waiting');
            setLeaderboard([]);
            setCurrentQuestion(null);
            setAnswerFeedback(null);
            console.log('Trò chơi đã bắt đầu (chờ câu hỏi đầu tiên)!');
        });

        socket.on('showing-question', (data) => {
            setGameStatus('showing_question');
            setCurrentQuestion({ id: data.id, questionText: data.questionText });
            setSelectedAnswer(null);
            setAnswerFeedback(null);
            setCorrectAnswerId(null);
            setCountdownValue(0);
            clearInterval(timerRef.current);
            setTimeLeft(0);
            console.log('Đang hiển thị câu hỏi:', data.questionText);
        });

        socket.on('countdown', (value) => {
            setGameStatus('countdown_to_options');
            setCountdownValue(value);
            console.log('Đếm ngược:', value);
        });

        socket.on('new-question', (question) => {
            setGameStatus('playing');
            setCurrentQuestion(question);
            setSelectedAnswer(null);
            setAnswerFeedback(null);
            setCorrectAnswerId(null);
            setTimeLeft(question.timeLimit);
            setCountdownValue(0);
            startTimer(question.timeLimit);
            console.log('Nhận câu hỏi mới:', question.questionText);
        });

        socket.on('answer-feedback', (feedback) => {
            setAnswerFeedback(feedback);
        });

        socket.on('question-ended', (data) => {
            setGameStatus('showing_results');
            clearInterval(timerRef.current);
            setTimeLeft(0);
            setCorrectAnswerId(data.correctAnswerId);
            setLeaderboard(data.leaderboard); // Player's leaderboard is updated here
            console.log('Câu hỏi đã kết thúc. Đáp án đúng:', data.correctAnswerId);
        });

        socket.on('leaderboard-update', (lb) => {
            setLeaderboard(lb);
            console.log('Bảng xếp hạng cập nhật:', lb);
        });

        socket.on('next-question-ready', () => {
            console.log('Sẵn sàng cho câu hỏi tiếp theo...');
            setGameStatus('waiting');
            setCurrentQuestion(null);
            setAnswerFeedback(null);
            setCorrectAnswerId(null);
            setCountdownValue(0);
        });

        socket.on('game-ended', (data) => {
            setGameStatus('ended');
            setLeaderboard(data.leaderboard);
            setCurrentQuestion(null);
            clearInterval(timerRef.current);
            setTimeLeft(0);
            setAnswerFeedback(null);
            setCorrectAnswerId(null);
            setCountdownValue(0);
            console.log('Trò chơi đã kết thúc!');
        });

        return () => {
            socket.off('game-state');
            socket.off('player-list-update');
            socket.off('game-started');
            socket.off('showing-question');
            socket.off('countdown');
            socket.off('new-question');
            socket.off('answer-feedback');
            socket.off('question-ended');
            socket.off('leaderboard-update');
            socket.off('next-question-ready');
            socket.off('game-ended');
            clearInterval(timerRef.current);
        };
    }, [socket, timerRef]);

    const startTimer = (duration) => {
        clearInterval(timerRef.current);
        let timeRemaining = duration;
        timerRef.current = setInterval(() => {
            timeRemaining--;
            setTimeLeft(timeRemaining);
            if (timeRemaining <= 0) {
                clearInterval(timerRef.current);
            }
        }, 1000);
    };

    const handleJoin = () => {
        if (nickname.trim()) {
            socket.emit('player-join', { nickname: nickname.trim(), avatarId }, (response) => {
                if (response.success) {
                    setJoined(true);
                    setJoinMessage(response.message);
                } else {
                    setJoinMessage(response.message);
                }
            });
        } else {
            setJoinMessage('Vui lòng nhập nickname của bạn!');
        }
    };

    const handleSubmitAnswer = (answerId) => {
        if (!selectedAnswer && currentQuestion && gameStatus === 'playing' && timeLeft > 0) {
            setSelectedAnswer(answerId);
            socket.emit('submit-answer', { questionId: currentQuestion.id, answerId });
        }
    };

    // Hàm để tính toán thứ hạng và điểm chênh lệch (dành cho màn hình thông tin cá nhân)
    const getPlayerRankInfo = () => {
        const myPlayer = leaderboard.find(p => p.nickname === myInfo.nickname);
        if (!myPlayer) return null;

        const myIndex = leaderboard.findIndex(p => p.nickname === myInfo.nickname);
        const myRank = myIndex + 1;

        if (myRank === 1) {
            return (
                <p className="rank-info-message top-rank">
                    Bạn đang ở **Hạng 1**! Tuyệt vời!
                </p>
            );
        } else if (myIndex > 0) {
            const playerAbove = leaderboard[myIndex - 1];
            const pointsToCatchUp = playerAbove.score - myPlayer.score;
            return (
                <p className="rank-info-message">
                    Bạn đang ở **Hạng {myRank}**. Cố lên! Chỉ còn **{pointsToCatchUp} điểm** để vượt qua **{playerAbove.nickname}** ở hạng {myRank - 1}.
                </p>
            );
        }
        return null;
    };


    const renderGameScreen = () => {
        if (!joined) {
            return (
                <div className="player-join-form">
                    <h2>Tham gia trò chơi</h2>
                    <input
                        type="text"
                        placeholder="Nhập Nickname của bạn"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        maxLength={20}
                    />
                    <div className="avatar-selection">
                        {avatars.map(av => (
                            <div
                                key={av}
                                className={`avatar-option-wrapper ${avatarId === av ? 'selected' : ''}`}
                                onClick={() => setAvatarId(av)}
                            >
                                <img
                                    src={`/${av}.png`}
                                    alt={av}
                                    className="avatar-option"
                                />
                            </div>
                        ))}
                    </div>
                    <button onClick={handleJoin}>Tham gia</button>
                    {joinMessage && <p className="join-message">{joinMessage}</p>}
                </div>
            );
        }

        if (showPlayerInfo) {
            return (
                <div className="player-info-screen">
                    <h2>Thông tin của bạn</h2>
                    <img src={`/${myInfo.avatarId}.png`} alt={myInfo.avatarId} className="player-avatar-large" />
                    <h3>Nickname: {myInfo.nickname}</h3>
                    <p>Điểm của bạn: {myInfo.score}</p>
                    {leaderboard.length > 0 && getPlayerRankInfo()} {/* Hiển thị thông tin hạng ở đây */}
                    <button onClick={() => setShowPlayerInfo(false)}>Quay lại Game</button>
                </div>
            );
        }

        if (gameStatus === 'waiting' || gameStatus === 'game_started') {
            return (
                <div className="game-waiting-screen">
                    <h2>Đang chờ trò chơi bắt đầu...</h2>
                    <p>Chào mừng, **{nickname}**!</p>
                    <h3>Người chơi trong phòng:</h3>
                    <ul className="player-list">
                        {playerList.map(p => (
                            <li key={p.id}>
                                <img src={`/${p.avatarId}.png`} alt={p.avatarId} className="player-avatar" />
                                {p.nickname} {p.connected ? '' : '(Ngắt kết nối)'}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (gameStatus === 'showing_question') {
            return (
                <div className="game-playing-screen">
                    {currentQuestion && (
                        <div className="question-container">
                            <h3 className="question-text-only">{currentQuestion.questionText}</h3>
                            <p>Sẵn sàng...</p>
                        </div>
                    )}
                </div>
            );
        }

        if (gameStatus === 'countdown_to_options') {
            return (
                <div className="game-playing-screen">
                    {currentQuestion && (
                        <div className="question-container">
                            <h3 className="question-text-only">{currentQuestion.questionText}</h3>
                            <div className="countdown-timer">{countdownValue}</div>
                        </div>
                    )}
                </div>
            );
        }

        if (gameStatus === 'playing') {
            return (
                <div className="game-playing-screen">
                    {currentQuestion ? (
                        <div className="question-container">
                            <div className="time-left">Thời gian: {timeLeft}s</div>
                            <h3>{currentQuestion.questionText}</h3>
                            <div className="options-grid">
                                {currentQuestion.options.map((option) => (
                                    <button
                                        key={option.id}
                                        className={`option-button ${selectedAnswer === option.id ? 'selected' : ''}`}
                                        onClick={() => handleSubmitAnswer(option.id)}
                                        disabled={selectedAnswer !== null || timeLeft <= 0}
                                    >
                                        {option.text}
                                    </button>
                                ))}
                            </div>
                            {answerFeedback && (
                                <p className={`feedback-message ${answerFeedback.isCorrect ? 'correct' : 'wrong'}`}>
                                    Bạn trả lời: {answerFeedback.isCorrect ? 'ĐÚNG!' : 'SAI!'} (+{answerFeedback.pointsEarned} điểm)
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="waiting-for-question">
                            <h2>Đang chờ câu hỏi từ Admin...</h2>
                            <p>Điểm của bạn: **{playerList.find(p => p.id === socket.id)?.score || 0}**</p>
                        </div>
                    )}
                </div>
            );
        }

        if (gameStatus === 'showing_results') {
            return (
                <div className="game-results-screen">
                    <h2>Kết quả Câu hỏi!</h2>
                    {currentQuestion && (
                        <p className="correct-answer-display">Đáp án đúng là: **{currentQuestion.options.find(opt => opt.id === correctAnswerId)?.text}**</p>
                    )}
                    <p className={`feedback-message ${answerFeedback && answerFeedback.isCorrect ? 'correct' : 'wrong'}`}>
                        Bạn trả lời: {answerFeedback ? (answerFeedback.isCorrect ? 'ĐÚNG!' : 'SAI!') : 'Không trả lời'} (+{answerFeedback?.pointsEarned || 0} điểm)
                    </p>
                    <div className="leaderboard-section">
                        <h3>Bảng xếp hạng hiện tại:</h3>
                        <ul className="leaderboard-list">
                            {leaderboard.map((p, index) => (
                                <li key={p.nickname}>
                                    {index + 1}. <img src={`/${p.avatarId}.png`} alt={p.avatarId} className="player-avatar-small" /> {p.nickname}: {p.score} điểm
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* KHÔNG HIỂN THỊ THÔNG TIN HẠNG CÁ NHÂN Ở ĐÂY */}
                    <p>Chuẩn bị cho câu hỏi tiếp theo...</p>
                </div>
            );
        }

        if (gameStatus === 'ended') {
            return (
                <div className="game-ended-screen">
                    <h2>Trò chơi đã kết thúc!</h2>
                    <h3>Bảng xếp hạng cuối cùng:</h3>
                    <ul className="leaderboard-list final-leaderboard">
                        {leaderboard.map((p, index) => (
                            <li key={p.nickname}>
                                {index + 1}. <img src={`/${p.avatarId}.png`} alt={p.avatarId} className="player-avatar-small" /> {p.nickname}: {p.score} điểm
                            </li>
                        ))}
                    </ul>
                    {/* KHÔNG HIỂN THỊ THÔNG TIN HẠNG CÁ NHÂN Ở ĐÂY */}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="player-screen-wrapper">
            {renderGameScreen()}
            {joined && (
                <button className="view-my-info-button" onClick={() => setShowPlayerInfo(true)}>
                    Xem thông tin của tôi
                </button>
            )}
        </div>
    );
}

export default PlayerScreen;