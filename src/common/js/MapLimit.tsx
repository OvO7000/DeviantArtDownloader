class MapLimit<T> {
    private executed: boolean = false
    private stopped: boolean = false
    private canceled: boolean = false
    private resolveList: Function[] = []

    constructor(
        private list: T[] = [],
        private limit: number = 1
    ) {
    }

    execute(asyncHandle: (arg0: T) => Promise<any>) {
        if (!this.executed) {
            this.executed = true
            let listCopy = ([] as T[]).concat(this.list)
            let asyncList = []
            let _limit = this.list.length < this.limit ? this.list.length : this.limit

            const stopper = () => {
                return new Promise((resolve, reject) => {
                    this.resolveList.push(resolve)
                })
            }
            let recursion = async (): Promise<any> => {
                if (listCopy.length === 0 || this.canceled) return
                if (this.stopped) await stopper()
                await asyncHandle(listCopy.pop()!)
                return recursion()
            }
            while (_limit--) {
                asyncList.push(recursion())
            }
            // 所有并发异步操作都完成后，本次并发控制迭代完成
            return Promise.all(asyncList).then(() => {
                this.executed = false
                this.stopped = false
                this.canceled = false
            })
        }
    }

    cancel() {
        this.canceled = true
    }

    stop() {
        this.stopped = true
    }

    continue() {
        this.stopped = false
        this.resolveList.forEach((resolve) => {
            resolve()
        })
    }
}

export default MapLimit



