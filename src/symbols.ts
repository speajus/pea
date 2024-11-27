export const serviceSymbol = Symbol("service");
export const destroySymbol = Symbol("destroy");
export const removeSymbol = Symbol("remove");

export const service = <T>(name: string): symbol & { [serviceSymbol]: T } => {
    return Symbol(name) as any;
}