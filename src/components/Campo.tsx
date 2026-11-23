export function Campo({
  nome, rotulo, valor, tipo = "text", className = "", ...rest
}: { nome: string; rotulo: string; valor?: string | number | null; tipo?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={nome}>{rotulo}</label>
      <input id={nome} name={nome} type={tipo} defaultValue={valor ?? ""} className="input" {...rest} />
    </div>
  );
}
