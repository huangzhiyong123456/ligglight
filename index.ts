export class SearchText {
    private targetNode: HTMLElement;
    private hiliteTag: string;
    private skipTags: RegExp;

    private matchRegExp: string | RegExp;
    private searchText: string;
    private matches: any[] | HTMLCollection;

    constructor(targetNode: HTMLElement, tag?: string) {
        this.targetNode = targetNode || document.body;
        this.hiliteTag = tag || 'MARK';
        this.skipTags = new RegExp("^(?:" + this.hiliteTag + "|SCRIPT|FORM)$");
        this.matchRegExp = "";
    }

    public find(text: string) {
        this.remove();
        let str = text
        if (str === undefined || !(str = str.replace(/(^\s+|\s+$)/g, ""))) {
            return;
        }

        let query = this.convertToRegExpString(str);
        this.searchText = str;

        const flags = `gi`;
        this.matchRegExp = new RegExp(query, flags);

        return this.hiliteText();
    }

    public gotoMatch(idx: number) {
        if (this.matches[idx]) {
            let elems = this.matches[idx]
            if (elems.length > 0) {
                elems[0].scrollIntoView({ behavior: "smooth", block: "center" });
            }
            for (let i = 0; i < this.matches.length; i++) {
                let color = (idx == i) ? '#FF9633' : '#FFFF55';
                for (let j = 0; j < this.matches[i].length; j++) {
                    let elem = this.matches[i][j];
                    elem.style.background = color;
                }
            }
        }
        return false
    }

    private hiliteText() {
        if (this.targetNode === undefined || !this.targetNode) return;
        if (!(this.matchRegExp instanceof RegExp)) return;
        if (this.skipTags.test(this.targetNode.nodeName)) return;
        let text = this.targetNode.textContent;
        let matches: number[] = []

        let regs;
        while (regs = this.matchRegExp.exec(text)) {
            matches.push(regs.index);
        }

        let length = matches.length

        this.matchElement(matches);
        return length;
    }

    private matchElement(indexs: number[]) {
        let searchLength = this.searchText.length;
        let walker = document.createTreeWalker(this.targetNode, NodeFilter.SHOW_TEXT);
        let next = walker.nextNode() as Text;
        let pos = 0
        let index = indexs.shift();
        let markLength = 0;
        this.matches = []
        let elems: HTMLElement[] = []

        while (next && Number.isInteger(index)) {
            let nodeLength = next.textContent.length;
            if (pos + nodeLength >= index && pos <= index + searchLength) {
                let start = 0;
                let end = nodeLength;
                if (index - pos > 0) {
                    start = index - pos;
                }
                if (pos + nodeLength >= index + searchLength) {
                    end = index + searchLength - pos
                }
                if (end - start > 0) {
                    let { textNode, endAfter, match } = this.renderLight(next, start, end);
                    elems.push(match)

                    markLength = markLength + end - start;
                    if (markLength === searchLength) {
                        index = indexs.shift();
                        this.matches.push([...elems])
                        elems = []
                        markLength = 0;
                    }
                    if (endAfter) {
                        pos += (nodeLength - endAfter.length);
                    } else {
                        pos += next.textContent.length;
                    }
                    next = walker.nextNode() as Text;
                    continue;
                }
            }
            pos += next.textContent.length;
            next = walker.nextNode() as Text;
        }
    }

    /**
     * 渲染高亮的元素
     * @param elem 
     * @param start 
     * @param end 
     */
    private renderLight(elem: Text, start: number, end: number) {
        let str = elem.textContent.slice(start, end);
        let match = document.createElement(this.hiliteTag);
        let textNode = document.createTextNode(str);
        match.style.background = '#FFFF55';
        match.appendChild(textNode);

        let endAfter;
        let startAfter;
        if (end < elem.textContent.length) {
            endAfter = elem.splitText(end);
        }
        if (start > 0) {
            startAfter = elem.splitText(start);
        }

        if (endAfter) {
            elem.parentNode.replaceChild(match, endAfter.previousSibling);
        } else if (startAfter) {
            elem.parentNode.replaceChild(match, startAfter);
        } else {
            elem.parentNode.replaceChild(match, elem);
        }

        return { textNode, endAfter, match };
    }

    /**
     * 移除当前高亮的元素
     */
    private remove() {
        let markEl;
        while ((markEl = this.targetNode.querySelector(this.hiliteTag)) && markEl.textContent) {
            let text = new Text(markEl.textContent);
            let parentNode = markEl.parentNode;
            if (parentNode) {
                parentNode.replaceChild(text, markEl);
                parentNode.normalize();
            } else {
                break;
            }
        }
    }

    private convertToRegExpString(str: string): string {
        const SPECIAL_CHARS_REG_EXP = /([.*+?^${}()|[\]\\])|(\p{P})|(\s+)|(\p{M})|(\p{L})/gu;
        const DIACRITICS_EXCEPTION = new Set([
            0x3099, 0x309a,
            0x094d, 0x09cd, 0x0a4d, 0x0acd, 0x0b4d, 0x0bcd, 0x0c4d, 0x0ccd, 0x0d3b,
            0x0d3c, 0x0d4d, 0x0dca, 0x0e3a, 0x0eba, 0x0f84, 0x1039, 0x103a, 0x1714,
            0x1734, 0x17d2, 0x1a60, 0x1b44, 0x1baa, 0x1bab, 0x1bf2, 0x1bf3, 0x2d7f,
            0xa806, 0xa82c, 0xa8c4, 0xa953, 0xa9c0, 0xaaf6, 0xabed,
            0x0c56,
            0x0f71,
            0x0f72, 0x0f7a, 0x0f7b, 0x0f7c, 0x0f7d, 0x0f80,
            0x0f74,
        ]);
        let query = str.replace(SPECIAL_CHARS_REG_EXP, (match, p1, p2, p3, p4, p5) => {
            if (p1) {
                return `[ ]*\\${p1}[ ]*`;
            }
            if (p2) {
                return `[ ]*${p2}[ ]*`;
            }
            if (p3) {
                return "[ ]+";
            }
            if (p4) {
                return DIACRITICS_EXCEPTION.has(p4.charCodeAt(0)) ? p4 : "";
            }
            return p5;
        })

        const trailingSpaces = "[ ]*";
        if (query.endsWith(trailingSpaces)) {
            query = query.slice(0, query.length - trailingSpaces.length);
        }
        return query;
    }
}