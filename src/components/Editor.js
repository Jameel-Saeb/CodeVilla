import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml'; // for HTML
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange, language, value  }) => {
    const editorRef = useRef(null);
    const textAreaRef = useRef(null);

    useEffect(() => {
        async function init() {
            if (!editorRef.current) {
                editorRef.current = Codemirror.fromTextArea(textAreaRef.current, {
                    mode: { name: language, json: language === "javascript" },
                    theme: 'monokai',
                    lineWrapping: true,
                    lint: true,
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    autoCloseTags: true,
                    matchBrackets: true,
                    matchTags: {bothTags: true},
                    foldGutter: true,
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                    extraKeys: { 
                        "Ctrl-Space": "autocomplete", 
                    },
                });
                editorRef.current.on('change', (instance, changes) => {
                    const { origin } = changes;
                    const code = instance.getValue();
                    onCodeChange(code);
                    if (origin !== 'setValue') {
                        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                            roomId,
                            code,
                            language,
                        });
                    }
                });
            }
            else {
                editorRef.current.setOption("mode", { name: language, json: language === "javascript" });
                editorRef.current.setValue(value); // Update the editor's content
            }
        };

            init();

            // Cleanup function
            return () => {
                if (editorRef.current) {
                    editorRef.current.toTextArea();
                    editorRef.current = null;
                }
            };
        }, [language]); // Re-run the effect when the language changes
    
        // Effect to update value when switching back to an editor
        useEffect(() => {
            if (editorRef.current && value !== editorRef.current.getValue()) {
                editorRef.current.setValue(value);
            }
        }, [value]); // Re-run the effect when the value changes

        useEffect(() => {
            if (socketRef.current) {
                socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, language: incomingLanguage }) => {
                    if (language === incomingLanguage && editorRef.current) {
                        editorRef.current.setValue(code);
                    }
                });
            }
        
            return () => {
                if (socketRef.current) {
                    socketRef.current.off(ACTIONS.CODE_CHANGE);
                }
            };
        }, [language]);
    
        return <textarea ref={textAreaRef} />;
    };
    
    export default Editor;



