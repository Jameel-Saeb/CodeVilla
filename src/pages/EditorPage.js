import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import Button from '../components/Button';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/mdn-like.css';
import 'codemirror/theme/the-matrix.css';
import 'codemirror/theme/night.css';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import { editableInputTypes } from '@testing-library/user-event/dist/utils';

const EditorPage = ({ language }) => {
    //handeling choosen language
    const [openedEditor, setOpenedEditor] = useState("html");
    const [activeButton, setActiveButton] = useState("html");
  
    const [html, setHtml] = useState("");
    const [css, setCss] = useState("");
    const [js, setJs] = useState("");
    const [srcDoc, setSrcDoc] = useState(``);
  
    const onTabClick = (editorName) => {
      setOpenedEditor(editorName);
      setActiveButton(editorName);
    };

    //handeling clients
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Inside the useEffect where you handle socket connections
            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room.`);
                    console.log(`${username} joined`);
                }
                setClients(clients);
                // Adjust this to send the current state for each language
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    roomId,
                    socketId,
                    code: { html: html, css: css, js: js }, // Example adjustment
                });
            });

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    useEffect(() => {
        const timeOut = setTimeout(() => {
          setSrcDoc(
            `
              <html>
                <body>${html}</body>
                <style>${css}</style>
                <script>${js}</script>
              </html>
            `
          );
        }, 250);
    
        return () => clearTimeout(timeOut);
      }, [html, css, js]);

    function handleChange(code) {
        codeRef.current = code;
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <h1> Code Live Collab
                        </h1>
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
            <div className="tab-button-container">
                <Button
                backgroundColor={activeButton === "html" ? "blue" : ""}
                title="HTML"
                onClick={() => {
                    onTabClick("html");
                }}
                />
                <Button
                backgroundColor={activeButton === "css" ? "blue" : ""}
                title="CSS"
                onClick={() => {
                    onTabClick("css");
                }}
                />
                <Button
                backgroundColor={activeButton === "js" ? "blue" : ""}
                title="JavaScript"
                onClick={() => {
                    onTabClick("js");
                }}
                
                />
            
                </div>
                {openedEditor === "html" ? (
            <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={setHtml}
                language="xml"
                value={html}
            />
        ) : openedEditor === "css" ? (
            <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={setCss}
                language="css"
                value={css}
            />
        ) : (
            <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={setJs}
                language="javascript"
                value={js}
            />
        )}
            </div>

        </div>
    );
};

export default EditorPage;