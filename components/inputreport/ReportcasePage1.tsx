'use client'
import React, { useEffect } from 'react'
import Box1 from '../inputcase/Box1'
import Box2 from '../inputcase/Box2'
import Box3 from '../inputcase/Box3'
import Box4 from '../inputcase/Box4'
import Box5 from '../inputcase/Box5'
import Box6 from '../inputcase/Box6'
import { getpersonhistorybyid } from '@/action/api'

function ReportcasePage1() {
    useEffect(() => {
        refresh()
    }, [])

    const refresh = async () => {
        const data = await getpersonhistorybyid("1082");
        console.log("dataaaaaaaaaaaaaaa", data);
    }
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6">
            <div className="w-full max-w-5xl flex flex-col items-center gap-4">
                <Box1 />
                <Box2 />
                <Box3 />
                <Box4 />
                <Box5 />
                <Box6 />
            </div>
        </div>
    )
}

export default ReportcasePage1