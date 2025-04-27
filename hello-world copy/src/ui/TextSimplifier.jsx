import React, { useState } from 'react';
import { Button } from '@swc-react/button';

const TextSimplifier = ({ sandboxProxy }) => {
    const [inputText, setInputText] = useState('');
    const [simplifiedText, setSimplifiedText] = useState('');
    const [flowchartNodes, setFlowchartNodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSimplify = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError('');
        setFlowchartNodes([]); // Reset flowchart nodes
        
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                // Fallback: split inputText into sentences
                const sentences = inputText
                    .split(/[\.\n]+/)             
                    .map(s => s.trim())
                    .filter(s => s);
                const nodes = sentences.map(s => ({ title: s, description: '' }));
                setFlowchartNodes(nodes);
                setSimplifiedText(JSON.stringify(nodes, null, 2));
                setIsLoading(false);
                return;
            }

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that simplifies text and breaks it down into flowchart nodes. Each node should be a clear, concise step or concept. Return ONLY the JSON array of nodes, without any explanation. The JSON array should contain objects with 'title' and 'description' keys."
                        },
                        {
                            role: "user",
                            content: `Please break down this text into flowchart nodes: ${inputText}`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to simplify text');
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('API Response:', content);
            
            try {
                // Try parsing the JSON response directly
                let nodes;
                try {
                    nodes = JSON.parse(content.trim());
                } catch (firstError) {
                    console.warn('Direct JSON parse failed, attempting to extract array...', firstError);
                    // Fallback: extract first JSON array in the text
                    const match = content.match(/\[([\s\S]*)\]/);
                    if (match) {
                        nodes = JSON.parse(match[0]);
                    } else {
                        throw firstError;
                    }
                }
                console.log('Parsed nodes:', nodes);
                setFlowchartNodes(nodes);
                setSimplifiedText(JSON.stringify(nodes, null, 2)); // Pretty print the JSON
            } catch (parseError) {
                console.error('Error parsing flowchart nodes:', parseError);
                // Fallback: split content into sentences for nodes
                const sentences = content
                    .split(/[\.\n]+/)             
                    .map(s => s.trim())
                    .filter(s => s);
                const fallbackNodes = sentences.map((s, i) => ({ title: s, description: '' }));
                console.log('Fallback nodes:', fallbackNodes);
                setFlowchartNodes(fallbackNodes);
                setSimplifiedText(JSON.stringify(fallbackNodes, null, 2)); // Pretty print fallback nodes
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message || 'Error occurred while simplifying text.');
            setSimplifiedText('');
            setFlowchartNodes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const createFlowchart = async () => {
        // Determine nodes to use
        let nodesToUse = flowchartNodes;
        // Fallback: if no nodes from JSON, split simplifiedText into sentences
        if (!nodesToUse.length && simplifiedText) {
            const sentences = simplifiedText
                .split(/[\.\n]+/)             
                .map(s => s.trim())
                .filter(s => s);
            nodesToUse = sentences.map((s, i) => ({ title: s, description: '' }));
            setFlowchartNodes(nodesToUse);
        }
        if (!nodesToUse.length) {
            setError('Cannot create flowchart: no nodes available');
            return;
        }

        try {
            // Create a box and text for each node via sandbox API
            for (let i = 0; i < nodesToUse.length; i++) {
                const node = nodesToUse[i];
                const x = 100;
                const y = 100 + i * 150;
                // Rectangle
                await sandboxProxy.createRectangleWithProps({ width: 200, height: 100, x, y, colorHex: '#FFFFFF' });
                // Text
                await sandboxProxy.createTextWithProps({ text: node.title, x: x + 10, y: y + 10, fontSize: 12, colorHex: '#000000' });
            }    
        } catch (error) {
            console.error('Error creating flowchart:', error);
            setError('Error creating flowchart: ' + error.message);
        }
    };

    // Debug log to check button state
    console.log('Flowchart nodes:', flowchartNodes);
    console.log('Button disabled:', !flowchartNodes.length || !sandboxProxy);

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Text Simplifier & Flowchart Creator</h2>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to simplify and convert to flowchart..."
                style={{
                    width: '100%',
                    minHeight: '150px',
                    marginBottom: '20px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                }}
            />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Button
                    onClick={handleSimplify}
                    disabled={isLoading || !inputText.trim()}
                >
                    {isLoading ? 'Simplifying...' : 'Simplify Text'}
                </Button>
                <Button onClick={createFlowchart} disabled={flowchartNodes.length === 0}>
                    Create Flowchart
                </Button>
            </div>
            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    border: '1px solid #ef9a9a',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}
            {simplifiedText && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                }}>
                    <h3>Simplified Text:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{simplifiedText}</pre>
                </div>
            )}
        </div>
    );
};

export default TextSimplifier; 