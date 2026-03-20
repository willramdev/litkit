import type { MatchResult, RouteMatcher } from "./types.ts";

interface Token {
  kind: "static" | "param" | "wildcard";
  value: string; // segment text for static, param name for param, "*" for wildcard
}

function tokenize(pattern: string): Token[] {
  if (pattern === "*") {
    return [{ kind: "wildcard", value: "*" }];
  }

  const segments = pattern.split("/").filter(Boolean);
  const tokens: Token[] = [];

  for (const seg of segments) {
    if (seg === "*") {
      tokens.push({ kind: "wildcard", value: "*" });
    } else if (seg.startsWith(":")) {
      tokens.push({ kind: "param", value: seg.slice(1) });
    } else {
      tokens.push({ kind: "static", value: seg });
    }
  }

  return tokens;
}

function buildRegex(tokens: Token[]): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  let source = "^";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.kind) {
      case "static":
        source += `/${escapeRegex(token.value)}`;
        break;
      case "param":
        source += `/([^/]+)`;
        paramNames.push(token.value);
        break;
      case "wildcard":
        source += `(?:/(.*))?`;
        paramNames.push("*");
        break;
    }
  }

  // Root route: match exactly "/"
  if (tokens.length === 0) {
    source += "/$";
  } else {
    // Allow optional trailing slash
    source += "/?$";
  }

  return { regex: new RegExp(source), paramNames };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A compiled fallback route matcher that uses regex.
 * Works in all browsers without URLPattern support.
 */
export class CompiledPathMatcher implements RouteMatcher {
  readonly pattern: string;
  private readonly regex: RegExp;
  private readonly paramNames: string[];
  private readonly isCatchAll: boolean;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.isCatchAll = pattern === "*";

    const tokens = tokenize(pattern);
    const { regex, paramNames } = buildRegex(tokens);
    this.regex = regex;
    this.paramNames = paramNames;
  }

  test(pathname: string): boolean {
    if (this.isCatchAll) return true;
    return this.regex.test(pathname);
  }

  exec(pathname: string): MatchResult | null {
    if (this.isCatchAll) {
      return { params: { "*": pathname } };
    }

    const match = this.regex.exec(pathname);
    if (!match) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < this.paramNames.length; i++) {
      params[this.paramNames[i]] = match[i + 1] ?? "";
    }

    return { params };
  }
}
