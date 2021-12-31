

class MapLimit {
    private executed: boolean = false
    private stopped: boolean = false
    private canceled: boolean = false
    private resolveList: Function[] = []
    private reject: Function | null = null
    constructor(
        private list: any[] = [],
        private limit: number = 1
    ) {}
    execute (asyncHandle: (...rest: any[]) => Promise<any>) {
        if (!this.executed) {
            this.executed = true
            let recursion = (arr: any[]): Promise<any> => {
                return asyncHandle(arr.shift())
                    .then(() => {
                        if (this.canceled) return
                        else if (arr.length !== 0 && this.stopped) {
                            return new Promise((resolve, reject)=>{
                                this.resolveList.push(resolve)
                                this.reject = reject
                            }).then(() => {
                                return recursion(arr)
                            })
                        }
                        else if (arr.length !== 0) return recursion(arr)   // 数组还未迭代完，递归继续进行迭代
                        else return
                    })
            }

            let listCopy = ([] as any[]).concat(this.list)
            let asyncList = [] // 正在进行的所有并发异步操作
            let _limit = this.list.length < this.limit ? this.list.length : this.limit
            while (_limit--) {
                asyncList.push(recursion(listCopy))
            }
            // 所有并发异步操作都完成后，本次并发控制迭代完成
            return Promise.all(asyncList).then(()=>{
                this.executed = false
                this.stopped = false
                this.canceled = false
            })
        }
    }
    cancel () {
        if (this.stopped) {
           this.reject && this.reject()
        }
        else {
            this.canceled = true
        }
    }
    stop () {
        this.stopped = true
    }
    continue () {
        this.stopped = false
        this.resolveList.forEach((resolve)=>{
            resolve()
        })
    }
}

export default MapLimit
