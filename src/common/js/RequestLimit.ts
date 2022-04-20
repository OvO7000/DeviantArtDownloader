class RequestLimit<T> {
    private executed: boolean = false
    private stopped: boolean = false
    private canceled: boolean = false
    private resolve: Function | null = null

    constructor(
        private list: T[] = [],
        private time: number = 800
    ) {
    }

    async execute(asyncHandler: (arg0: T) => Promise<void>) {

        if (!this.executed) {
            this.executed = true
            let listCopy = ([] as T[]).concat(this.list)
            const handler = (item: T): Promise<void> => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        await asyncHandler(item)
                        resolve()
                    }, this.time)
                })
            }
            const stopper = () => {
                return new Promise((resolve, reject) => {
                    this.resolve = resolve
                })
            }
            for (let item of listCopy) {
                if (this.canceled) return
                if (this.stopped) await stopper()
                await handler(item)
            }
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
        this.resolve && this.resolve()
    }
}

export default RequestLimit



