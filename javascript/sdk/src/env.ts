export let env: { [key: string]: string | undefined } = {}

if (typeof process !== 'undefined') env = process.env
else if ('env' in import.meta) env = (import.meta as any).env
