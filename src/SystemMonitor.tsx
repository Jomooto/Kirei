import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, HardDrive, Zap, Activity, AlertTriangle } from "lucide-react";

export function SystemMonitor() {
  const [statusData, setStatusData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to ensure interval keeps going correctly
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    
    const fetchStatus = async () => {
      if (!mounted.current) return;
      try {
        const jsonStr = await invoke<string>("get_system_status");
        if (mounted.current) {
          setStatusData(JSON.parse(jsonStr));
          setError(null);
        }
      } catch (e) {
        console.error(e);
        if (mounted.current) setError(String(e));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-400 text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Error obteniendo estado del sistema: {error}</p>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/50">
        <Activity size={48} className="animate-pulse mb-4" />
        <p>Conectando con sensores del sistema...</p>
      </div>
    );
  }

  // Desestructuración de los datos del JSON
  const { hardware, cpu, memory, top_processes } = statusData;
  const mainDisk = statusData.disks && statusData.disks[0];

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col gap-6 p-2 h-full overflow-y-auto custom-scrollbar">
      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CPU */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <Cpu size={24} />
            <h2 className="text-lg font-bold text-white">CPU</h2>
          </div>
          <div className="text-4xl font-light mb-2">{cpu.usage.toFixed(1)}<span className="text-lg text-white/50">%</span></div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${cpu.usage}%` }}></div>
          </div>
          <div className="text-xs text-white/50 flex justify-between mt-auto">
            <span>{hardware.cpu_model}</span>
            <span>{cpu.core_count} Núcleos</span>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-purple-400">
            <Zap size={24} />
            <h2 className="text-lg font-bold text-white">Memoria RAM</h2>
          </div>
          <div className="text-4xl font-light mb-2">{memory.used_percent.toFixed(1)}<span className="text-lg text-white/50">%</span></div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-purple-500 h-2 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${memory.used_percent}%` }}></div>
          </div>
          <div className="text-xs text-white/50 flex justify-between mt-auto">
            <span>{(memory.used / (1024**3)).toFixed(1)} GB Usados</span>
            <span>{hardware.total_ram} Total</span>
          </div>
        </div>

        {/* Disco Principal */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <HardDrive size={24} />
            <h2 className="text-lg font-bold text-white">Disco ({mainDisk?.mount || '/'})</h2>
          </div>
          <div className="text-4xl font-light mb-2">{mainDisk?.used_percent?.toFixed(1) || 0}<span className="text-lg text-white/50">%</span></div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${mainDisk?.used_percent || 0}%` }}></div>
          </div>
          <div className="text-xs text-white/50 flex justify-between mt-auto">
            <span>{((mainDisk?.used || 0) / (1024**3)).toFixed(1)} GB Usados</span>
            <span>{hardware.disk_size} Total</span>
          </div>
        </div>
      </div>

      {/* Top Procesos */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col shadow-xl flex-1 min-h-[250px]">
        <div className="flex items-center gap-3 mb-6 text-white/80">
          <Activity size={20} />
          <h2 className="text-lg font-bold">Procesos de Mayor Consumo</h2>
        </div>
        
        <div className="flex-1 overflow-auto pr-2">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white/40 uppercase sticky top-0 bg-[#161616] pb-2 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Proceso</th>
                <th className="px-4 py-3 font-medium text-right w-24">PID</th>
                <th className="px-4 py-3 font-medium text-right w-24">CPU %</th>
                <th className="px-4 py-3 font-medium text-right w-24">RAM %</th>
              </tr>
            </thead>
            <tbody>
              {top_processes?.map((proc: any, i: number) => (
                <tr key={`${proc.pid}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white/90 truncate max-w-[200px]">{proc.name}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-right">{proc.pid}</td>
                  <td className="px-4 py-3 text-blue-400 font-mono text-right">{proc.cpu.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-purple-400 font-mono text-right">{proc.memory.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
