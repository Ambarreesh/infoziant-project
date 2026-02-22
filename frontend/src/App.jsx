import { useState, useRef, useEffect } from 'react';

function App() {
  const [data, setData] = useState({ folders: [], files: [] });
  const [activeView, setActiveView] = useState('my-drive');
  const [currentFolder, setCurrentFolder] = useState({ id: 'root', name: 'My Drive' });
  const [history, setHistory] = useState([]);
  const [reader, setReader] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, [activeView, currentFolder]);

  // --- CORE FUNCTIONS ---
  const loadData = async () => {
    try {
      const res = await fetch(`/api/content/${activeView}/${currentFolder.id}`);
      const result = await res.json();
      setData(result);
    } catch (e) { console.error("Sync Error"); }
  };

  const createFolder = async () => {
    const name = prompt("New Folder Name:");
    if (!name) return;
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: currentFolder.id })
    });
    loadData();
  };

  const handleUpload = async (files) => {
    setIsUploading(true);
    for (let f of files) {
      const fd = new FormData();
      fd.append('file', f);
      await fetch(`/api/upload/${currentFolder.id}`, { method: 'POST', body: fd });
    }
    setIsUploading(false);
    loadData();
  };

  const performAction = async (type, id, action) => {
    await fetch(`/api/action/${type}/${id}/${action}`, { method: 'PUT' });
    loadData();
  };

  const deleteForever = async (type, id) => {
    if(window.confirm("Delete this asset permanently? This cannot be undone.")) {
      await fetch(`/api/permanent/${type}/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  // --- NAVIGATION ---
  const enterFolder = (f) => {
    setHistory([...history, currentFolder]);
    setCurrentFolder({ id: f._id, name: f.name });
  };

  const goBack = () => {
    const prev = history.pop();
    setHistory([...history]);
    setCurrentFolder(prev || { id: 'root', name: 'My Drive' });
  };

  return (
    <div className="fixed inset-0 flex bg-[#F2F2F7] text-[#1C1C1E] font-sans overflow-hidden">
      
      {/* iCLOUD SIDEBAR */}
      <aside className="w-72 bg-white/70 backdrop-blur-3xl border-r border-gray-200 flex flex-col p-6 z-30">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-[#007AFF] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">f</div>
          <h1 className="text-2xl font-black tracking-tighter">fCloud</h1>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'my-drive', label: 'My Drive', icon: '📁' },
            { id: 'recent', label: 'Recent', icon: '🕒' },
            { id: 'starred', label: 'Starred', icon: '⭐' },
            { id: 'trash', label: 'Trash', icon: '🗑️' }
          ].map(tab => (
            <button key={tab.id} onClick={() => {setActiveView(tab.id); setCurrentFolder({id:'root', name:'My Drive'}); setHistory([]);}} 
              className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeView === tab.id ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 scale-105' : 'text-[#8E8E93] hover:bg-gray-200/50'}`}>
              <span className="text-lg">{tab.icon}</span> 
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Storage Widget */}
        <div className="mt-auto p-5 bg-white/40 rounded-[2rem] border border-white">
          <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest mb-2">Workspace Storage</p>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#34C759] w-[45%] rounded-full"></div>
          </div>
          <p className="text-[10px] mt-2 text-[#8E8E93] font-medium">45 GB of 100 GB used</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-20 flex items-center justify-between px-10 bg-white/40 backdrop-blur-xl border-b border-gray-200/50">
          <div className="flex items-center gap-4">
            {history.length > 0 && activeView === 'my-drive' && (
              <button onClick={goBack} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#007AFF] shadow-sm hover:scale-105 transition">←</button>
            )}
            <span className="text-xl font-bold tracking-tight capitalize">{activeView === 'my-drive' ? currentFolder.name : activeView}</span>
          </div>
          <div className="flex items-center gap-5">
            <input type="search" placeholder="Search Feunic Assets..." className="bg-white/60 border border-white rounded-full px-6 py-2.5 w-72 text-sm outline-none focus:bg-white focus:ring-4 ring-blue-500/10 transition-all shadow-sm" />
            <div className="w-10 h-10 bg-gradient-to-tr from-[#007AFF] to-[#5856D6] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">AR</div>
          </div>
        </header>

        <main className="flex-1 p-12 overflow-y-auto" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); handleUpload(e.dataTransfer.files)}}>
          
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-[#007AFF] font-bold text-xs uppercase tracking-[0.25em] mb-2">Cloud Infrastructure</p>
              <h2 className="text-4xl font-black tracking-tighter">Digital Assets</h2>
            </div>
            <div className="flex gap-4">
              {activeView === 'my-drive' && (
                <>
                  <button onClick={createFolder} className="px-6 py-3.5 bg-white border border-gray-200 rounded-full font-bold text-[#007AFF] text-sm hover:shadow-md transition-all active:scale-95">New Folder</button>
                  <button onClick={() => fileInputRef.current.click()} disabled={isUploading} className="px-8 py-3.5 bg-[#007AFF] text-white rounded-full font-bold shadow-xl shadow-blue-500/30 hover:bg-[#0062CC] transition-all active:scale-95 text-sm">
                    {isUploading ? 'Syncing...' : 'Upload Files'}
                  </button>
                </>
              )}
              <input type="file" multiple hidden ref={fileInputRef} onChange={e => handleUpload(e.target.files)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-8">
            {/* FOLDERS */}
            {data.folders.map(f => (
              <div key={f._id} onDoubleClick={() => enterFolder(f)} className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-transparent hover:border-blue-100 hover:shadow-2xl transition-all cursor-pointer relative text-center">
                <div className="w-16 h-12 bg-[#FFD60A]/10 rounded-xl mb-4 mx-auto flex items-center justify-center text-3xl">📂</div>
                <h4 className="font-bold text-sm truncate px-2">{f.name}</h4>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                  {activeView === 'trash' ? (
                    <button onClick={(e) => {e.stopPropagation(); performAction('folder', f._id, 'restore')}} className="w-8 h-8 bg-green-500 text-white rounded-full shadow-md">🔄</button>
                  ) : (
                    <button onClick={(e) => {e.stopPropagation(); performAction('folder', f._id, 'trash')}} className="w-8 h-8 bg-red-50 text-red-500 rounded-full shadow-md">✕</button>
                  )}
                </div>
              </div>
            ))}

            {/* FILES */}
            {data.files.map(f => (
              <div key={f._id} className="group bg-white p-4 rounded-[2.5rem] shadow-sm border border-transparent hover:border-blue-100 hover:shadow-2xl transition-all relative overflow-hidden">
                <div onClick={() => setReader(f)} className="h-40 bg-[#FBFBFD] rounded-[2rem] mb-4 flex items-center justify-center overflow-hidden border border-gray-100 cursor-zoom-in">
                  {f.originalName.match(/\.(jpg|png|jpeg|webp)$/i) ? (
                    <img src={`/uploads/${f.filename}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="text-4xl opacity-30 font-black uppercase text-gray-500">{f.originalName.split('.').pop()}</div>
                  )}
                </div>
                <h4 className="font-bold text-sm truncate px-2 text-center text-gray-800">{f.originalName}</h4>
                <p className="text-[10px] text-[#8E8E93] font-bold mt-1 uppercase text-center tracking-widest">{(f.size/1024/1024).toFixed(2)} MB</p>
                
                {/* Float Actions */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex flex-col gap-2 transition-all translate-x-2 group-hover:translate-x-0">
                  {activeView === 'trash' ? (
                    <>
                      <button onClick={() => performAction('file', f._id, 'restore')} className="w-9 h-9 bg-green-500 text-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition">🔄</button>
                      <button onClick={() => deleteForever('file', f._id)} className="w-9 h-9 bg-red-500 text-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition">✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => window.open(`/api/download/${f._id}`)} className="w-9 h-9 bg-white/90 backdrop-blur shadow-xl rounded-full flex items-center justify-center text-[#007AFF] hover:scale-110 transition">↓</button>
                      <button onClick={() => performAction('file', f._id, 'star')} className={`w-9 h-9 bg-white/90 backdrop-blur shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition ${f.isStarred ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                      <button onClick={() => performAction('file', f._id, 'trash')} className="w-9 h-9 bg-white/90 backdrop-blur shadow-xl rounded-full flex items-center justify-center text-red-500 hover:scale-110 transition">✕</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.folders.length === 0 && data.files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-40">
               <div className="text-8xl mb-6 shadow-sm">☁️</div>
               <p className="text-2xl font-black tracking-tight text-gray-500">No assets found</p>
            </div>
          )}
        </main>
      </div>

      {/* APPLE QUICKLOOK DOCUMENT READER */}
      {reader && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg flex flex-col animate-in fade-in duration-200">
          <header className="h-20 flex items-center justify-between px-10 text-white border-b border-white/10">
            <div className="flex items-center gap-6">
              <button onClick={() => setReader(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-xl flex items-center justify-center transition">✕</button>
              <div>
                <h2 className="font-bold text-lg">{reader.originalName}</h2>
                <p className="text-xs text-white/50 uppercase tracking-widest">{(reader.size/1024/1024).toFixed(2)} MB • Preview Mode</p>
              </div>
            </div>
            <a href={`/api/download/${reader._id}`} className="bg-[#007AFF] px-8 py-3 rounded-full font-bold text-sm shadow-lg hover:bg-[#0062CC] transition-all">Download Asset</a>
          </header>
          <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
            {reader.originalName.match(/\.(pdf)$/i) ? (
              <iframe src={`/uploads/${reader.filename}`} className="w-full h-full rounded-2xl bg-white shadow-2xl" />
            ) : reader.originalName.match(/\.(jpg|png|jpeg|webp)$/i) ? (
              <img src={`/uploads/${reader.filename}`} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
            ) : (
               <div className="bg-white p-20 rounded-[3rem] text-center shadow-2xl max-w-md">
                 <div className="text-7xl mb-6">📄</div>
                 <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter text-gray-800">{reader.originalName.split('.').pop()} Document</h2>
                 <p className="text-gray-500 text-sm font-medium">This file format is optimized for offline viewing. Click download to retrieve it.</p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;